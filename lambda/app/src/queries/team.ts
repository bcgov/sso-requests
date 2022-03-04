import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { User } from '../../../shared/interfaces';
import { getMyTeamsLiteral } from './literals';

export const getTeamById = async (teamId: number, options?: { raw: boolean }) => {
  return models.team.findOne({
    where: { id: teamId },
    ...options,
  });
};

export const getTeamsForUser = async (userId: number, options?: { raw: boolean }) => {
  return models.team.findAll({
    include: [
      {
        model: models.usersTeam,
        where: { userId },
        required: true,
        attributes: [],
      },
    ],
    attributes: [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      [sequelize.col('usersTeams.role'), 'role'],
      [sequelize.literal('(select count(*) FROM requests WHERE "requests"."team_id"="team"."id")'), 'integrationCount'],
    ],
    ...options,
  });
};

export const getAllowedTeams = async (user: User, options?: { raw: boolean }) => {
  const where: any = {};
  if (!user.isAdmin) {
    const teamIdsLiteral = getMyTeamsLiteral(user.id);
    where.id = { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) };
  }

  return models.team.findAll({
    where,
    attributes: [
      'id',
      'name',
      'createdAt',
      'updatedAt',
      [sequelize.literal('(select count(*) FROM requests WHERE "requests"."team_id"="team"."id")'), 'integrationCount'],
    ],
    ...options,
  });
};

export const getMemberOnTeam = async (teamId: number, userId: number, options: { raw: boolean }) => {
  return models.user.findOne({
    where: { id: userId },
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
      [sequelize.col('usersTeams.updated_at'), 'updatedAt'],
    ],
    ...options,
  });
};
