import { Op } from 'sequelize';
import { findTeamsForUser, getMemberOnTeam } from '@lambda-app/queries/team';
import { inviteTeamMembers } from '@lambda-app/utils/helpers';
import { lowcase } from '@lambda-app/helpers/string';
import { sequelize, models } from '@lambda-shared/sequelize/models/models';
import { sendTemplate } from '@lambda-shared/templates';
import { EMAILS } from '@lambda-shared/enums';
import { User, Team, Member } from '@lambda-shared/interfaces';
import { dispatchRequestWorkflow, closeOpenPullRequests } from '../github';
import { getTeamById, findAllowedTeamUsers } from '../queries/team';
import { getTeamIdLiteralOutOfRange } from '../queries/literals';
import { getUserById } from '../queries/user';
import { generateInstallation, updateClientSecret } from '../keycloak/installation';

export const listTeams = async (user: User) => {
  const result = await findTeamsForUser(user.id, { raw: true });
  return result;
};

export const createTeam = async (user: User, data: Team) => {
  const { name, members } = data;
  const team = await models.team.create({ name });
  await Promise.all([
    addUsersToTeam(team.id, user.id, members),
    models.usersTeam.create({ teamId: team.id, userId: user.id, role: 'admin', pending: false }),
  ]);
  return team;
};

export const addUsersToTeam = async (teamId: number, userId: number, members: Member[]) => {
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
    inviteTeamMembers(allUsers, teamId),
  ]).then((result) => result.slice(0, -1).map((userTeam) => userTeam.userId));
};

export const updateTeam = async (user: User, id: string, data: { name: string }) => {
  const updated = await models.team.update(
    { name: data.name },
    {
      where: {
        id,
      },
      returning: true,
      plain: true,
    },
  );

  if (updated.length < 2) {
    throw Error('update failed');
  }

  return updated[1].dataValues;
};

export const deleteTeam = async (user: User, id: string) => {
  // Clear fkey from teams archived requests
  await models.request.update(
    { teamId: null },
    {
      where: {
        teamId: id,
        archived: true,
      },
      returning: true,
      omitNull: false,
    },
  );

  const team = await models.team.findOne({ where: { id } });
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

export const userIsTeamAdmin = async (user: User, teamId: number) => {
  const { id } = user;
  return models.usersTeam.findOne({
    where: {
      userId: id,
      teamId,
      role: 'admin',
      pending: false,
    },
  });
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
  if (teamAdmins.length === 1 && teamAdmins.id === userId) return false;
  return true;
};

export const removeUserFromTeam = async (userId: number, teamId: number) => {
  const canRemove = canRemoveUser(userId, teamId);
  if (!canRemove) throw new Error('Not allowed');

  await models.usersTeam.destroy({ where: { userId, teamId } });

  const [user, team] = await Promise.all([getUserById(userId), getTeamById(teamId)]);
  await Promise.all([
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_ADMINS, { user, team }),
    sendTemplate(EMAILS.TEAM_MEMBER_DELETED_USER_REMOVED, { user, team }),
  ]);

  return true;
};

export const updateMemberInTeam = async (teamId: number, userId: number, data: { role: string }) => {
  await models.usersTeam.update(
    { role: data.role },
    {
      where: {
        userId,
        teamId,
      },
      returning: true,
      plain: true,
    },
  );

  return getMemberOnTeam(teamId, userId, { raw: true });
};

export const requestServiceAccount = async (userId: number, teamId: number, requester: string) => {
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);
  const serviceAccount = await models.request.create({
    projectName: `Service Account for team #${teamId}`,
    serviceType: 'gold',
    usesTeam: true,
    teamId: sequelize.literal(`(${teamIdLiteral})`),
    apiServiceAccount: true,
  });

  if (!serviceAccount.teamId) {
    await serviceAccount.destroy();
    throw Error(`team #${teamId} is not allowed for user #${userId}`);
  }

  serviceAccount.status = 'submitted';
  serviceAccount.clientId = `service-account-team-${teamId}-${serviceAccount.id}`;
  serviceAccount.requester = requester;

  const ghResult = await dispatchRequestWorkflow(serviceAccount);
  if (ghResult.status !== 204) {
    await serviceAccount.destroy();
    throw Error('failed to create a workflow dispatch event');
  }

  await serviceAccount.save();
  return serviceAccount;
};

export const getServiceAccount = async (userId: number, teamId: number) => {
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);

  return models.request.findOne({
    where: {
      serviceType: 'gold',
      usesTeam: true,
      apiServiceAccount: true,
      teamId: { [Op.in]: sequelize.literal(`(${teamIdLiteral})`) },
    },
    attributes: ['id', 'clientId', 'teamId', 'status'],
    raw: true,
  });
};

export const downloadServiceAccount = async (userId: number, teamId: number, saId: number) => {
  const teamIdLiteral = getTeamIdLiteralOutOfRange(userId, teamId, ['admin']);

  const integration = await models.request.findOne({
    where: {
      id: saId,
      serviceType: 'gold',
      usesTeam: true,
      apiServiceAccount: true,
      status: 'applied',
      teamId: { [Op.in]: sequelize.literal(`(${teamIdLiteral})`) },
    },
    attributes: ['clientId', 'serviceType'],
    raw: true,
  });

  const installation = await generateInstallation({
    serviceType: integration.serviceType,
    environment: 'prod',
    realmName: 'standard',
    clientId: integration.clientId,
  });

  return installation;
};
