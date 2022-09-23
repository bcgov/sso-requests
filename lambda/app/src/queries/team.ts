import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { User } from '../../../shared/interfaces';
import { getMyTeamsLiteral } from './literals';

export const getTeamById = async (teamId: number, options = { raw: true }) => {
  return models.team.findOne({
    where: { id: teamId },
    ...options,
  });
};

const teamAttributes = [
  'id',
  'name',
  'createdAt',
  'updatedAt',
  [
    sequelize.literal(
      '(select count(*) FROM requests WHERE "requests"."team_id"="team"."id" AND "requests"."archived"=false AND "api_service_account"=false)',
    ),
    'integrationCount',
  ],
  [
    sequelize.literal(
      '(select count(*) FROM requests WHERE "requests"."team_id"="team"."id" AND "requests"."archived"=false AND "api_service_account"=true)',
    ),
    'serviceAccountCount',
  ],
];

export const findTeamsForUser = async (userId: number, options = { raw: true }) => {
  return models.team.findAll({
    include: [
      {
        model: models.usersTeam,
        where: { userId, pending: false },
        required: true,
        attributes: [],
      },
    ],
    attributes: [...teamAttributes, [sequelize.col('usersTeams.role'), 'role']],
    ...options,
  });
};

export const getAllowedTeams = async (user: User, options = { raw: true }) => {
  const where: any = {};
  if (!user.isAdmin) {
    const teamIdsLiteral = getMyTeamsLiteral(user.id);
    where.id = { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) };
  }

  return models.team.findAll({
    where,
    attributes: teamAttributes,
    ...options,
  });
};

export const getAllowedTeam = async (teamId: number, user: User, options = { raw: true }) => {
  const teamIdsLiteral = getMyTeamsLiteral(user.id);
  const where = user.isAdmin
    ? { id: teamId }
    : {
        [Op.and]: [
          {
            id: teamId,
          },
          {
            id: { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) },
          },
        ],
      };

  return models.team.findOne({
    where,
    attributes: teamAttributes,
    ...options,
  });
};

const userTeamAttributes = [
  'id',
  'idirUserid',
  'idirEmail',
  [sequelize.col('usersTeams.role'), 'role'],
  [sequelize.col('usersTeams.pending'), 'pending'],
  [sequelize.col('usersTeams.created_at'), 'createdAt'],
  [sequelize.col('usersTeams.updated_at'), 'updatedAt'],
];

export const getMemberOnTeam = async (teamId: number, userId: number, options = { raw: true }) => {
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
    attributes: userTeamAttributes,
    ...options,
  });
};

export const getMembersOnTeam = async (teamId: number, options = { raw: true }) => {
  return models.user.findAll({
    where: {},
    include: [
      {
        model: models.usersTeam,
        where: { teamId },
        required: false,
        attributes: [],
      },
    ],
    attributes: userTeamAttributes,
    ...options,
  });
};

export const findAllowedTeamUsers = async (teamId: number, userId: number, options = { raw: true }) => {
  const teamIdsLiteral = getMyTeamsLiteral(userId);

  const where = {
    [Op.and]: [
      {
        teamId,
      },
      {
        teamId: { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) },
      },
    ],
  };

  return models.user.findAll({
    include: [
      {
        model: models.usersTeam,
        where,
        required: true,
        attributes: [],
      },
    ],
    attributes: userTeamAttributes,
    ...options,
  });
};
