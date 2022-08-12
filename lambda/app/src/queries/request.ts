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
      usesTeam: false,
      userId,
    },
  ];

  return where;
};

export const findMyOrTeamIntegrationsByService = async (userId: number, options = { raw: true }) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId);
  where.archived = false;

  return models.request.findAll({
    where,
    attributes: ['id', 'serviceType'],
    ...options,
  });
};

export const getMyOrTeamRequest = async (userId: number, requestId: number, roles: string[] = ['member', 'admin']) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId, roles);
  where.id = requestId;

  return models.request.findOne({
    where,
    include: commonPopulation,
  });
};

export const findAllowedIntegrationInfo = async (
  userId: number,
  integrationId: number,
  roles: string[] = ['member', 'admin'],
  options = { raw: true },
) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId, roles);
  where.id = integrationId;

  return models.request.findOne({ where, attributes: ['id', 'clientId', 'devIdps'], ...options });
};

export const getAllowedRequest = async (session: Session, requestId: number, roles?: string[]) => {
  if (isAdmin(session)) {
    return models.request.findOne({
      where: { id: requestId, apiServiceAccount: false },
      include: commonPopulation,
    });
  }

  return getMyOrTeamRequest(session.user.id, requestId, roles);
};

export const listIntegrationsForTeam = async (
  session: Session,
  teamId: number,
  serviceType?: string,
  options?: { raw: boolean },
) => {
  if (isAdmin(session)) {
    const where: any = { teamId, apiServiceAccount: false, archived: false };

    if (serviceType) where.serviceType = serviceType;
    return models.request.findAll({
      where,
      ...options,
    });
  }

  const { user } = session;
  const where: any = { apiServiceAccount: false, archived: false };
  const teamIdsLiteral = getMyTeamsLiteral(user.id);

  if (serviceType) where.serviceType = serviceType;

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

export const getIntegrationsByTeam = async (teamId: number, serviceType?: string, options?: { raw: boolean }) => {
  const where: any = { teamId, apiServiceAccount: false, archived: false };
  console.log(teamId);
  if (serviceType) where.serviceType = serviceType;
  return models.request.findAll({
    where,
    ...options,
  });
};

export const getIntegrationsByUserTeam = async (
  user: User,
  teamId: number,
  serviceType?: string,
  options?: { raw: boolean },
) => {
  const where: any = { apiServiceAccount: false, archived: false };
  const teamIdsLiteral = getMyTeamsLiteral(user.id);

  if (serviceType) where.serviceType = serviceType;

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
