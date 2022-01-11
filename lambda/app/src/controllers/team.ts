import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { User, Team } from '../../../shared/interfaces';
import { inviteTeamMembers } from '../utils/helpers';

export const listTeams = async (user: User) => {
  const result = await models.team.findAll({
    where: {
      id: { [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}')`) },
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

  return Promise.all([
    ...allUsers.map((user) => models.usersTeam.create({ teamId, userId: user.id, role: user.role, pending: true })),
    inviteTeamMembers(allUsers, teamId),
  ]);
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
      returning: true,
      plain: true,
    },
  );
  return result === 1;
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
      ],
    })
    .then((res) => {
      return res.map((user) => user.dataValues);
    });
};
