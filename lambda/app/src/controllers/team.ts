import { Op, literal } from 'sequelize';
import { models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { kebabCase } from 'lodash';
import { fetchClient } from '../keycloak/client';

export const listTeams = async (user: User) => {
  const result = await models.team.findAll({
    where: {
      id: { [Op.in]: literal(`(select team_id from users_teams where user_id='${user.id}')`) },
    },
  });

  return result;
};

export const createTeam = async (user: User, data: { name: string }) => {
  const result = await models.team.create({
    name: data.name,
  });

  const newteam = result.dataValues;

  await models.teamUser.create({ userId: user.id, teamId: newteam.id, role: 'owner' });

  return newteam;
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
