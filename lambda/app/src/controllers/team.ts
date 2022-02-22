import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { User, Team } from '../../../shared/interfaces';
import { inviteTeamMembers } from '../utils/helpers';
import { getMmberOnTeam } from '@lambda-app/queries/team';

export const listTeams = async (user: User) => {
  const result = await models.team.findAll({
    where: {
      id: {
        [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}' and pending = false)`),
      },
    },
  });

  return result;
};

export const createTeam = async (user: User, data: Team) => {
  const { members } = data;
  const team = await models.team.create({ name: data.name });
  await Promise.all([
    addUsersToTeam(team.id, members),
    models.usersTeam.create({ teamId: team.id, userId: user.id, role: 'admin', pending: false }),
  ]);
  return team;
};

export const addUsersToTeam = async (teamId: number, members: User[]) => {
  const usersEmailsAlreadyOnTeam = await getUsersOnTeam(teamId).then((result) =>
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

  const result = await models.team.destroy({
    where: {
      id,
    },
  });

  // it returns the number of deleted rows
  return result === 1;
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

export const getUsersOnTeam = async (teamId: number) => {
  return models.user
    .findAll({
      include: [
        {
          model: models.usersTeam,
          where: { teamId },
          required: true,
          attributes: [],
        },
      ],
      attributes: [
        'id',
        'idirUserid',
        'idirEmail',
        [sequelize.col('usersTeams.role'), 'role'],
        [sequelize.col('usersTeams.pending'), 'pending'],
        [sequelize.col('usersTeams.created_at'), 'createdAt'],
      ],
    })
    .then((res) => {
      return res.map((user) => user.dataValues);
    });
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
  const teamMembers = await getUsersOnTeam(teamId);
  const teamAdmins = teamMembers.filter((member) => member.role === 'admin');
  if (teamAdmins.length === 1 && teamAdmins.id === userId) return false;
  return true;
};

export const removeUserFromTeam = async (userId: number, teamId: number) => {
  const canRemove = canRemoveUser(userId, teamId);
  if (!canRemove) throw new Error('Not allowed');
  return models.usersTeam.destroy({
    where: {
      userId,
      teamId,
    },
  });
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

  return getMmberOnTeam(teamId, userId, { raw: true });
};
