import { Op } from 'sequelize';
import {
  findTeamsForUser,
  getAllTeamAPIAccounts,
  getAllowedTeamAPIAccount,
  getMemberOnTeam,
  isTeamAdmin,
} from '@lambda-app/queries/team';
import { getDisplayName, inviteTeamMembers, isAdmin } from '@lambda-app/utils/helpers';
import { lowcase } from '@lambda-app/helpers/string';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { sendTemplate } from '@lambda-shared/templates';
import { EMAILS, EVENTS } from '@lambda-shared/enums';
import { User, Team, Member, Session } from '@lambda-shared/interfaces';
import { processIntegrationRequest } from '../controllers/requests';
import { getTeamById, findAllowedTeamUsers } from '../queries/team';
import { getTeamIdLiteralOutOfRange } from '../queries/literals';
import { getUserById } from '../queries/user';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';
import { getIntegrationsByTeam } from '@lambda-app/queries/request';
import { checkIfRequestMerged, createEvent } from './requests';
import createHttpError from 'http-errors';

export const listTeams = async (user: User) => {
  const result = await findTeamsForUser(user.id, { raw: true });
  return result;
};

export const createTeam = async (user: User, data: Team) => {
  const { name, members } = data;
  const team = await models.team.create({ name });
  await models.usersTeam.create({ teamId: team.id, userId: user.id, role: 'admin', pending: false });
  await addUsersToTeam(team.id, user.id, members);
  return team;
};

export const addUsersToTeam = async (teamId: number, userId: number, members: Member[]) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) throw new createHttpError.Forbidden('not allowed to add users to team');
  members = members.map((member) => ({ ...member, idirEmail: lowcase(member.idirEmail) }));

  const usersEmailsAlreadyOnTeam = await findAllowedTeamUsers(teamId, userId).then((result) =>
    result.map((member) => member.idirEmail),
  );
  const membersToAdd = members.filter((member) => !usersEmailsAlreadyOnTeam.includes(member.idirEmail));
  const memberEmails = membersToAdd.map((member) => member.idirEmail);
  const existingUsers = await models.user.findAll({
    where: {
      idir_email: { [Op.in]: memberEmails },
    },
  });
  const existingUserEmails = existingUsers.map((user) => user.idirEmail);
  const missingUsers = membersToAdd.filter((member) => !existingUserEmails.includes(member.idirEmail));
  const newUsers = await Promise.all(missingUsers.map((user) => models.user.create({ idirEmail: user.idirEmail })));
  const allUsers = membersToAdd.map((member) => {
    const { idirEmail, role } = member;
    let user = [...existingUsers, ...newUsers].find((user) => user.dataValues.idirEmail === idirEmail);
    user.role = role;
    return user;
  });

  // Return IDs of new users
  return Promise.all([
    ...allUsers.map((user) => models.usersTeam.create({ teamId, userId: user.id, role: user.role, pending: true })),
    inviteTeamMembers(userId, allUsers, teamId),
  ]).then((result) => result.slice(0, -1).map((userTeam) => userTeam.userId));
};

export const updateTeam = async (user: User, teamId: string, data: { name: string }) => {
  const authorized = await isTeamAdmin(user.id, Number(teamId));
  if (!authorized) throw new createHttpError.Forbidden('not allowed to update team');
  const updated = await models.team.update(
    { name: data.name },
    {
      where: {
        id: teamId,
      },
      returning: true,
      plain: true,
    },
  );

  if (updated.length < 2) {
    throw new createHttpError.UnprocessableEntity('update failed');
  }

  return updated[1].dataValues;
};

export const deleteTeam = async (session: Session, teamId: number) => {
  const authorized = await isTeamAdmin(session.user.id, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to delete team');
  }

  const svcAccts = await models.request.findAll({
    where: {
      teamId,
      apiServiceAccount: true,
      archived: false,
    },
    raw: true,
  });

  if (svcAccts.length > 0) {
    for (const svcAcct of svcAccts) {
      await deleteServiceAccount(session, session.user.id, teamId, svcAcct.id);
    }
  }

  // Clear fkey from teams archived requests
  await models.request.update(
    { teamId: null },
    {
      where: {
        teamId,
        archived: true,
      },
      returning: true,
      omitNull: false,
    },
  );

  const team = await models.team.findOne({ where: { id: teamId } });

  await sendTemplate(EMAILS.TEAM_DELETED, { team });
  await team.destroy();
  return true;
};

export const verifyTeamMember = async (userId: number, teamId: number) => {
  const result = await models.usersTeam.update(
    { pending: false },
    {
      where: {
        userId,
        teamId,
      },
    },
  );
  return result[0] === 1;
};

export const canManageTeam = async (session: Session, userId: number, teamId: number) => {
  if (isAdmin(session) || (await isTeamAdmin(userId, teamId))) return true;
  return false;
};

export const userCanReadTeam = async (user: User, teamId: number) => {
  const { id } = user;
  return models.usersTeam.findOne({
    where: {
      userId: id,
      teamId,
      pending: false,
    },
  });
};

const canRemoveUser = async (userId: number, teamId: number) => {
  const teamMembers = await findAllowedTeamUsers(teamId, userId);
  const teamAdmins = teamMembers.filter((member) => member.role === 'admin');
  const userIsLastAdmin = teamAdmins.length === 1 && Number(teamAdmins[0].id) === Number(userId);
  if (userIsLastAdmin) return false;
  return true;
};

export const removeUserFromTeam = async (userId: number, memberUserId: number, teamId: number) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) throw new createHttpError.Forbidden('not allowed to remove member from team');
  const canRemove = await canRemoveUser(memberUserId, teamId);
  if (!canRemove) throw new createHttpError.Forbidden('not allowed to remove user');

  await models.usersTeam.destroy({ where: { userId: memberUserId, teamId } });

  const [user, team] = await Promise.all([getUserById(memberUserId), getTeamById(teamId)]);
  await Promise.all([
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, { user, team }),
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, { user, team }),
  ]);

  return true;
};

export const updateMemberInTeam = async (
  userId: number,
  teamId: number,
  memberUserId: number,
  data: { role: string },
) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) throw new createHttpError.Forbidden('not allowed to update member in team');
  await models.usersTeam.update(
    { role: data.role },
    {
      where: {
        userId: memberUserId,
        teamId,
      },
      returning: true,
      plain: true,
    },
  );

  return getMemberOnTeam(teamId, userId, { raw: true });
};

export const requestServiceAccount = async (session: Session, userId: number, teamId: number, requester: string) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to request service account');
  }
  const existingServiceAccounts = await getServiceAccounts(userId, teamId);
  if (existingServiceAccounts.length > 0) {
    throw new createHttpError.Conflict('team already has api account');
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);
  const integrations = await getIntegrationsByTeam(teamId, 'gold');
  const team = await getTeamById(teamId);

  const serviceAccount = await models.request.create({
    projectName: `Service Account for team #${teamId}`,
    serviceType: 'gold',
    usesTeam: true,
    teamId: sequelize.literal(`(${teamIdLiteral})`),
    apiServiceAccount: true,
  });

  if (!serviceAccount.teamId) {
    await serviceAccount.destroy();
    throw new createHttpError.Forbidden(`team #${teamId} is not allowed for user #${userId}`);
  }

  serviceAccount.authType = 'service-account';
  serviceAccount.status = 'submitted';
  serviceAccount.clientId = `service-account-team-${teamId}-${serviceAccount.id}`;
  serviceAccount.requester = requester;
  serviceAccount.environments = ['prod']; // service accounts are by default only created in prod
  const saved = await serviceAccount.save();

  await processIntegrationRequest(saved);

  const eventData = {
    eventCode: EVENTS.REQUEST_CREATE_SUCCESS,
    requestId: saved?.id,
    userId: session.user.id,
    idirUserDisplayName: requester,
  };
  createEvent(eventData);

  await sendTemplate(EMAILS.CREATE_TEAM_API_ACCOUNT_SUBMITTED, { requester, team, integrations });

  return serviceAccount;
};

export const getServiceAccounts = async (userId: number, teamId: number) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden(`not allowed to fetch api accounts for the team #${teamId}`);
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);
  return await getAllTeamAPIAccounts(teamIdLiteral);
};

export const getServiceAccount = async (userId: number, teamId: number, saId: number) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden(`not allowed to fetch api account for the team #${teamId}`);
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);
  return await models.request.findOne({
    where: {
      id: saId,
      serviceType: 'gold',
      usesTeam: true,
      apiServiceAccount: true,
      archived: false,
      teamId: { [Op.in]: sequelize.literal(`(${teamIdLiteral})`) },
    },
    attributes: ['id', 'clientId', 'teamId', 'status', 'updatedAt', 'prNumber', 'archived', 'requester', 'serviceType'],
    raw: true,
  });
};

export const getServiceAccountCredentials = async (userId: number, teamId: number, saId: number) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to fetch api account credentials');
  }
  const integration = await getServiceAccount(userId, teamId, saId);
  const installation = await generateInstallation({
    serviceType: integration.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: integration.clientId,
  });

  return installation;
};

export const deleteServiceAccount = async (session: Session, userId: number, teamId: number, saId: number) => {
  try {
    const authorized = await canManageTeam(session, userId, teamId);
    if (!authorized) {
      throw new createHttpError.Forbidden('not allowed to delete api account');
    }
    const serviceAccount = await getAllowedTeamAPIAccount(session, saId, userId, teamId);
    if (!serviceAccount) {
      throw new createHttpError.NotFound('could not find api account');
    }
    const team = await getTeamById(teamId);
    const isMerged = await checkIfRequestMerged(saId);
    const requester = getDisplayName(session);
    serviceAccount.requester = requester;
    serviceAccount.status = 'submitted';
    serviceAccount.archived = true;
    serviceAccount.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
    const saved = await serviceAccount.save();

    if (isMerged) {
      // Trigger workflow with empty environments to delete client
      await processIntegrationRequest(saved);
    }

    await sendTemplate(EMAILS.DELETE_TEAM_API_ACCOUNT_SUBMITTED, { team, requester });

    createEvent({
      eventCode: EVENTS.TEAM_API_ACCOUNT_DELETE_SUCCESS,
      requestId: saId,
      userId: session.user.id,
      idirUserDisplayName: session.user?.displayName,
    });

    return serviceAccount;
  } catch (err) {
    console.log(err);

    createEvent({
      eventCode: EVENTS.TEAM_API_ACCOUNT_DELETE_FAILURE,
      requestId: saId,
      userId: session.user.id,
      idirUserDisplayName: session.user?.displayName,
    });
    throw new createHttpError.UnprocessableEntity(err.message || err);
  }
};

export const updateServiceAccountSecret = async (userId: number, teamId: number, saId: number) => {
  const authorized = await isTeamAdmin(userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to update api account credentials');
  }
  const integration = await getServiceAccount(userId, teamId, saId);
  return await updateClientSecret({
    serviceType: integration.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: integration.clientId,
  });
};

export const restoreTeamServiceAccount = async (session: Session, userId: number, teamId: number, saId: number) => {
  const authorized = await canManageTeam(session, userId, teamId);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to restore api account');
  }
  const serviceAccount = await getAllowedTeamAPIAccount(session, saId, userId, teamId);
  if (!serviceAccount) {
    throw new createHttpError.NotFound('could not find api account');
  }
  const team = await getTeamById(teamId);
  const requester = getDisplayName(session);
  serviceAccount.requester = requester;
  serviceAccount.status = 'submitted';
  serviceAccount.archived = false;
  serviceAccount.updatedAt = sequelize.literal('CURRENT_TIMESTAMP');
  const saved = await serviceAccount.save();

  await processIntegrationRequest(saved, true);

  const teamIntegrations = await models.request.findAll({
    where: {
      teamId: serviceAccount.teamId,
      apiServiceAccount: false,
      archived: false,
      serviceType: 'gold',
    },
    raw: true,
    attributes: ['id', 'projectName', 'usesTeam', 'teamId', 'userId', 'devIdps', 'environments', 'authType'],
  });

  await sendTemplate(EMAILS.RESTORE_TEAM_API_ACCOUNT, {
    requester,
    team,
    integrations: teamIntegrations,
  });

  createEvent({
    eventCode: EVENTS.REQUEST_RESTORE_SUCCESS,
    requestId: saId,
    userId: session.user.id,
  });

  return serviceAccount;
};
