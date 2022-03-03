import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { isAdmin } from '../utils/helpers';
import { getMyTeamsLiteral } from './literals';

const commonPopulation = [
  {
    model: models.user,
    required: false,
  },
  {
    model: models.team,
    required: false,
  },
];

export const getBaseWhereForMyOrTeamIntegrations = (userId: number, roles?: string[]) => {
  const where: any = {};

  const teamIdsLiteral = getMyTeamsLiteral(userId, roles);

  where[Op.or] = [
    {
      usesTeam: true,
      teamId: {
        [Op.in]: sequelize.literal(`(${teamIdsLiteral})`),
      },
    },
    {
      userId,
    },
  ];

  return where;
};

export const getMyOrTeamRequest = async (userId: number, requestId: number, roles: string[] = ['user', 'admin']) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId, roles);
  where.id = requestId;

  return models.request.findOne({
    where,
    include: commonPopulation,
  });
};

export const getAllowedRequest = async (session: Session, requestId: number, roles?: string[]) => {
  if (isAdmin(session)) {
    return models.request.findOne({
      where: { id: requestId },
      include: commonPopulation,
    });
  }

  return getMyOrTeamRequest(session.user.id, requestId, roles);
};

export const listIntegrationsForTeam = async (session: Session, teamId: number, options?: { raw: boolean }) => {
  if (isAdmin(session)) {
    return models.request.findAll({
      where: { teamId, archived: false },
      ...options,
    });
  }

  const { user } = session;
  const where: any = { archived: false };

  const teamIdsLiteral = getMyTeamsLiteral(user.id);

  where[Op.and] = [
    {
      teamId,
    },
    {
      teamId: { [Op.in]: sequelize.literal(`(${teamIdsLiteral})`) },
    },
  ];

  return models.request.findAll({
    where,
    ...options,
  });
};
