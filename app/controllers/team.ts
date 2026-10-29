import { Op } from 'sequelize';
import {
  findTeamsForUser,
  getAllTeamAPIAccounts,
  getAllowedTeamAPIAccount,
  getMemberOnTeam,
  getTeamRoleByUserId,
} from '@app/queries/team';
import { authorizeTeam } from '@app/queries/teamAccess';
import { getDisplayName } from '@app/utils/helpers';
import { lowcase } from '@app/helpers/string';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { sendTemplate } from '@app/shared/templates';
import { EMAILS, EVENTS } from '@app/shared/enums';
import { User, Team, Member, Session } from '@app/shared/interfaces';
import {
  checkIfRequestMerged,
  assertWorkflowCompleted,
  enqueueIntegrationWorkflow,
  runIntegrationWorkflow,
} from '@app/controllers/requests';
import { audit, createEvent, runAuditedOperation } from '@app/queries/event';
import { getTeamById, findAllowedTeamUsers } from '../queries/team';
import { getTeamIdLiteralOutOfRange } from '../queries/literals';
import { getUserById } from '../queries/user';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';
import createHttpError from 'http-errors';
import { teamPermissions } from '@app/utils/authorize';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'controllers/team' });

export const listTeams = async (user: User) => {
  const result = await findTeamsForUser(user.id, { raw: true });
  return result;
};

export const createTeam = async (session: Session, data: Team) => {
  const { name, members } = data;
  const team = await sequelize.transaction(async (transaction) => {
    const createdTeam = await models.team.create({ name }, { transaction });
    await models.usersTeam.create(
      { teamId: createdTeam.id, userId: session?.user?.id, role: 'admin', pending: false },
      { transaction },
    );
    await createEvent(
      {
        eventCode: EVENTS.TEAM_MEMBER_ADDED,
        teamId: createdTeam.id,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: { teamId: createdTeam.id, userId: session?.user?.id, role: 'admin' },
      },
      transaction,
    );
    await createEvent(
      {
        eventCode: EVENTS.TEAM_CREATE_SUCCESS,
        teamId: createdTeam.id,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: { teamId: createdTeam.id, name },
      },
      transaction,
    );
    return createdTeam;
  });
  await addUsersToTeam(session, team.id, members);
  return team;
};

export const addUsersToTeam = async (session: Session, teamId: number, members: Member[]) => {
  const userId = session?.user?.id as number;
  if (!(await authorizeTeam(session, teamId, teamPermissions.ADD_MEMBER)))
    throw new createHttpError.Forbidden('not allowed to add users to team');
  const dedupedMembers = Array.from(
    members
      .map((member) => ({ ...member, idirEmail: lowcase(member?.idirEmail!) }))
      .reduce((acc, member) => {
        acc.set(member.idirEmail, member);
        return acc;
      }, new Map<string, Member>())
      .values(),
  );

  const usersEmailsAlreadyOnTeam = await findAllowedTeamUsers(teamId, userId).then((result) =>
    result.map((member: any) => member.idirEmail),
  );
  const membersToAdd = dedupedMembers.filter((member) => !usersEmailsAlreadyOnTeam.includes(member.idirEmail));
  if (membersToAdd.length === 0) {
    return [];
  }

  const memberEmails = membersToAdd.map((member) => member.idirEmail);
  const existingUsers = await models.user.findAll({
    where: {
      idir_email: { [Op.in]: memberEmails },
    },
  });
  const existingUserEmails = new Set(existingUsers.map((user: any) => user.idirEmail));
  const missingUsers = membersToAdd.filter((member) => !existingUserEmails.has(member.idirEmail));
  const newUsers = await Promise.all(missingUsers.map((user) => models.user.create({ idirEmail: user.idirEmail })));
  const usersByEmail = new Map([...existingUsers, ...newUsers].map((user: any) => [user.idirEmail, user]));

  const allUsers = membersToAdd.map((member) => {
    const { idirEmail, role } = member;
    const user = usersByEmail.get(idirEmail);
    if (!user) {
      throw new createHttpError.UnprocessableEntity(`failed to resolve user for email ${idirEmail}`);
    }
    return {
      id: user.id,
      idirEmail,
      role,
    };
  });

  const team = await getTeamById(teamId);

  // Return IDs of new users
  const userTeams = await Promise.all(
    allUsers.map(async (user) => {
      const userTeam = await sequelize.transaction(async (transaction) => {
        const membership = await models.usersTeam.create(
          { teamId, userId: user.id, role: user.role, pending: false },
          { transaction },
        );
        await createEvent(
          {
            eventCode: EVENTS.TEAM_MEMBER_ADDED,
            teamId,
            idirUserid: session?.idir_userid,
            idirUserDisplayName: session?.user?.displayName,
            details: { teamId, userId: user.id, role: user.role },
          },
          transaction,
        );
        return membership;
      });
      await sendTemplate(EMAILS.TEAM_MEMBER_ADDED, { email: user.idirEmail, team, role: user.role });
      return userTeam;
    }),
  );

  return userTeams.map((userTeam) => userTeam.userId);
};

export const updateTeam = async (session: Session, teamId: string, data: { name: string }) => {
  if (!(await authorizeTeam(session, Number(teamId), teamPermissions.UPDATE_TEAM)))
    throw new createHttpError.Forbidden('not allowed to update team');
  const currentTeam = await models.team.findByPk(teamId);
  if (!currentTeam) throw new createHttpError.NotFound('team not found');
  const updated = await sequelize.transaction(async (transaction) => {
    const [count, rows] = await models.team.update(
      { name: data.name },
      {
        where: { id: teamId },
        returning: true,
        transaction,
      },
    );
    if (count === 0) throw new createHttpError.UnprocessableEntity('update failed');
    await createEvent(
      {
        eventCode: EVENTS.TEAM_UPDATE_SUCCESS,
        teamId: Number(teamId),
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: {
          teamId: Number(teamId),
          before: { name: currentTeam.name },
          after: { name: data.name },
        },
      },
      transaction,
    );
    return rows[0];
  });
  return updated.dataValues;
};

export const deleteTeam = async (session: Session, teamId: number) => {
  const authorized = await authorizeTeam(session, Number(teamId), teamPermissions.DELETE_TEAM);
  if (!authorized) {
    throw new createHttpError.Forbidden('not allowed to delete team');
  }
  const { team } = authorized;

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
      await deleteServiceAccount(session, teamId, svcAcct.id);
    }
  }

  await sequelize.transaction(async (transaction) => {
    // Clear fkey from teams archived requests
    await models.request.update(
      { teamId: null },
      { where: { teamId, archived: true }, returning: true, omitNull: false, transaction },
    );
    await team.destroy({ transaction });
    await createEvent(
      {
        eventCode: EVENTS.TEAM_DELETE_SUCCESS,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: { teamId, name: team.name },
      },
      transaction,
    );
  });
  await sendTemplate(EMAILS.TEAM_DELETED, { team });
  return true;
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
  const teamAdmins = teamMembers.filter((member: any) => member.role === 'admin' && member.pending === false);
  const userIsLastAdmin = teamAdmins.length === 1 && Number(teamAdmins[0].id) === Number(userId);
  if (userIsLastAdmin) return false;
  return true;
};

export const removeUserFromTeam = async (session: Session, memberUserId: number, teamId: number) => {
  if (!(await authorizeTeam(session, teamId, teamPermissions.REMOVE_MEMBER)))
    throw new createHttpError.Forbidden('not allowed to remove member from team');
  const canRemove = await canRemoveUser(memberUserId, teamId);
  if (!canRemove) throw new createHttpError.Forbidden('not allowed to remove user');

  const userTeamRecord = await models.usersTeam.findOne({ where: { userId: memberUserId, teamId } });
  if (!userTeamRecord) throw new createHttpError.NotFound('team member not found');
  await sequelize.transaction(async (transaction) => {
    await userTeamRecord.destroy({ transaction });
    await createEvent(
      {
        eventCode: EVENTS.TEAM_MEMBER_REMOVED,
        teamId,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: { teamId, userId: memberUserId, role: userTeamRecord.role },
      },
      transaction,
    );
  });

  const [user, team] = await Promise.all([getUserById(memberUserId), getTeamById(teamId)]);
  await Promise.all([
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, { user, team }),
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, { user, team }),
  ]);

  return true;
};

export const updateMemberInTeam = async (
  session: Session,
  teamId: number,
  memberUserId: number,
  data: { role: string },
) => {
  const userId = session?.user?.id as number;
  if (!(await authorizeTeam(session, teamId, teamPermissions.UPDATE_MEMBER_ROLE)))
    throw new createHttpError.Forbidden('not allowed to update member in team');

  const memberCurrentRole = await getTeamRoleByUserId(memberUserId, teamId);
  if (!memberCurrentRole) throw new createHttpError.NotFound('team member not found');
  // Cannot demote the last admin until another is added
  const demotingAdmin = data.role !== 'admin' && memberCurrentRole.role === 'admin';
  if (demotingAdmin && !(await canRemoveUser(memberUserId, teamId))) {
    throw new createHttpError.Forbidden('not allowed to update member in team');
  }
  await sequelize.transaction(async (transaction) => {
    await models.usersTeam.update({ role: data.role }, { where: { userId: memberUserId, teamId }, transaction });
    const updatedMemberRole = await models.usersTeam.findOne({
      where: { userId: memberUserId, teamId },
      attributes: ['role', 'pending'],
      raw: true,
      transaction,
    });
    if (memberCurrentRole.role === updatedMemberRole?.role) return;
    await createEvent(
      {
        eventCode: EVENTS.TEAM_MEMBER_ROLE_UPDATED,
        teamId,
        idirUserid: session?.idir_userid,
        idirUserDisplayName: session?.user?.displayName,
        details: { teamId, userId: memberUserId, before: memberCurrentRole.role, after: updatedMemberRole?.role },
      },
      transaction,
    );
  });

  return getMemberOnTeam(teamId, memberUserId, { raw: true });
};

export const requestServiceAccount = async (session: Session, teamId: number, requester: string) => {
  const userId = session?.user?.id as number;
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
    throw new createHttpError.Forbidden('not allowed to request service account');
  }
  const existingServiceAccounts = await getServiceAccounts(session, teamId);
  if (existingServiceAccounts.length > 0) {
    throw new createHttpError.Conflict('team already has api account');
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);

  // The account, its workflow and the `requested` event commit together. A team the user may not use
  // resolves to no team, and rolling back means no account row is ever left behind for it.
  const { serviceAccount, enqueued } = await sequelize.transaction(async (transaction) => {
    const serviceAccount = await models.request.create(
      {
        projectName: `Service Account for team #${teamId}`,
        serviceType: 'gold',
        usesTeam: true,
        teamId: sequelize.literal(`(${teamIdLiteral})`),
        apiServiceAccount: true,
      },
      { transaction },
    );

    if (!serviceAccount.teamId) {
      throw new createHttpError.Forbidden(`team #${teamId} is not allowed for user #${userId}`);
    }

    serviceAccount.authType = 'service-account';
    serviceAccount.status = 'submitted';
    serviceAccount.clientId = `service-account-team-${teamId}-${serviceAccount.id}`;
    serviceAccount.requester = requester;
    serviceAccount.environments = ['prod']; // service accounts are by default only created in prod
    const saved = await serviceAccount.save({ transaction });

    const enqueued = await enqueueIntegrationWorkflow(saved, { awaitCompletion: true }, transaction);
    return { serviceAccount: saved, enqueued };
  });

  // Service account creation stays synchronous: the caller reads the client credentials right after.
  assertWorkflowCompleted(await runIntegrationWorkflow(enqueued, { awaitCompletion: true }));

  return serviceAccount;
};

export const getServiceAccounts = async (session: Session, teamId: number) => {
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
    throw new createHttpError.Forbidden(`not allowed to fetch api accounts for the team #${teamId}`);
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(session?.user?.id as number, teamId, ['admin']);
  return await getAllTeamAPIAccounts(teamIdLiteral);
};

export const getServiceAccount = async (session: Session, teamId: number, saId: number) => {
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
    throw new createHttpError.Forbidden(`not allowed to fetch api account for the team #${teamId}`);
  }
  const teamIdLiteral = getTeamIdLiteralOutOfRange(session?.user?.id as number, teamId, ['admin']);
  return await models.request.findOne({
    where: {
      id: saId,
      serviceType: 'gold',
      usesTeam: true,
      apiServiceAccount: true,
      archived: false,
      teamId: { [Op.in]: sequelize.literal(`(${teamIdLiteral})`) },
    },
    attributes: [
      'id',
      'clientId',
      'teamId',
      'status',
      'updatedAt',
      'prNumber',
      'archived',
      'requester',
      'serviceType',
      'authType',
    ],
    raw: true,
  });
};

export const getServiceAccountCredentials = async (session: Session, teamId: number, saId: number) => {
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
    throw new createHttpError.Forbidden('not allowed to fetch api account credentials');
  }
  const integration = await getServiceAccount(session, teamId, saId);
  const installation = await generateInstallation({
    serviceType: integration.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: integration.clientId,
    authType: integration.authType,
  });
  return installation;
};

export const deleteServiceAccount = async (session: Session, teamId: number, saId: number) => {
  const userId = session?.user?.id as number;
  try {
    if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
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

    // An applied account is deleted by a workflow that removes its client; one that never reached
    // Keycloak is deleted by this change alone.
    const enqueued = await sequelize.transaction(async (transaction) => {
      await serviceAccount.save({ transaction });
      if (isMerged) return enqueueIntegrationWorkflow(serviceAccount, { awaitCompletion: true }, transaction);
      await audit.createEvent(
        { action: 'api-account-delete', outcome: 'success', requestId: saId, teamId, details: {} },
        transaction,
      );
      return undefined;
    });

    if (isMerged) assertWorkflowCompleted(await runIntegrationWorkflow(enqueued, { awaitCompletion: true }));

    await sendTemplate(EMAILS.DELETE_TEAM_API_ACCOUNT_SUBMITTED, { team, requester });

    return serviceAccount;
  } catch (err) {
    // No event here: a failure before the commit left nothing behind, and one after it is the engine's.
    log.error({ err }, 'deleteServiceAccount failed');
    throw new createHttpError.UnprocessableEntity((err as any).message || err);
  }
};

export const updateServiceAccountSecret = async (session: Session, teamId: number, saId: number) => {
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
    throw new createHttpError.Forbidden('not allowed to update api account credentials');
  }
  const integration = await getServiceAccount(session, teamId, saId);
  return runAuditedOperation(
    {
      eventCode: EVENTS.SERVICE_ACCOUNT_SECRET_ROTATION_REQUESTED,
      requestId: saId,
      teamId,
      idirUserid: session?.idir_userid,
      idirUserDisplayName: session?.user?.displayName,
      details: { teamId },
    },
    EVENTS.SERVICE_ACCOUNT_SECRET_ROTATED,
    EVENTS.SERVICE_ACCOUNT_SECRET_ROTATION_FAILURE,
    () =>
      updateClientSecret({
        serviceType: integration.serviceType,
        environment: 'prod',
        realmName: 'standard',
        clientId: integration.clientId,
      }),
  );
};

export const restoreTeamServiceAccount = async (session: Session, teamId: number, saId: number) => {
  const userId = session?.user?.id as number;
  if (!(await authorizeTeam(session, teamId, teamPermissions.MANAGE_TEAM_API_ACCOUNTS))) {
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

  const enqueued = await sequelize.transaction(async (transaction) => {
    const saved = await serviceAccount.save({ transaction });
    return enqueueIntegrationWorkflow(saved, { restore: true, awaitCompletion: true }, transaction);
  });
  assertWorkflowCompleted(await runIntegrationWorkflow(enqueued, { awaitCompletion: true }));

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

  return serviceAccount;
};
