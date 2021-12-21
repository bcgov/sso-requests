import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { User } from '../../../shared/interfaces';
import { inviteTeamMembers } from '../utils/helpers';

export const listTeams = async (user: User) => {
  const result = await models.team.findAll({
    where: {
      id: { [Op.in]: sequelize.literal(`(select team_id from users_teams where user_id='${user.id}')`) },
    },
  });

  return result;
};

export const createTeam = async (user: User, data: { name: string; members: User[] }) => {
  const { members } = data;
  const memberEmails = members.map((member) => member.email);

  const [team, existingUsers] = await Promise.all([
    models.team.create({
      name: data.name,
    }),
    models.user.findAll({
      where: {
        idir_email: { [Op.in]: memberEmails },
      },
    }),
  ]);

  const existingUserEmails = existingUsers.map((user) => user.idirEmail);
  const missingUsers = members.filter((member) => !existingUserEmails.includes(member.email));

  const newUsers = await Promise.all(missingUsers.map((user) => models.user.create({ idirEmail: user.email })));
  const allUsers = members.map((member) => {
    const { email, role } = member;
    let user = [...existingUsers, ...newUsers].find((user) => user.dataValues.idirEmail === email);
    user.role = role;
    return user;
  });

  return Promise.all([
    ...allUsers.map((user) =>
      models.usersTeam.create({ teamId: team.id, userId: user.id, role: user.role, pending: true }),
    ),
    models.usersTeam.create({ teamId: team.id, userId: user.id, role: 'admin', pending: false }),
    inviteTeamMembers(allUsers, team.id),
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
