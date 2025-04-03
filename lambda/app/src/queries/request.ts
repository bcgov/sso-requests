import { Op } from 'sequelize';
import { sequelize, models } from '../../../shared/sequelize/models/models';
import { Session, User } from '../../../shared/interfaces';
import { getAllowedIdpsForApprover, isAdmin } from '../utils/helpers';
import { getMyTeamsLiteral, getUserTeamRole } from './literals';

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
  const where: any = { apiServiceAccount: false };

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
    // Cover case that users switched to team but have not selected one yet. This only applies in draft since
    // request cannot be submitted until a team is selected.
    {
      usesTeam: true,
      teamId: null,
      status: 'draft',
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
    attributes: {
      include: [[sequelize.literal(getUserTeamRole(userId)), 'userTeamRole']],
    },
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

  return models.request.findOne({
    where,
    attributes: [
      'id',
      'clientId',
      'devIdps',
      'apiServiceAccount',
      'status',
      'archived',
      'usesTeam',
      [sequelize.literal(getUserTeamRole(userId)), 'userTeamRole'],
    ],
    ...options,
  });
};

export const getAllowedRequest = async (session: Session, requestId: number, roles?: string[]) => {
  if (isAdmin(session)) {
    return models.request.findOne({
      where: { id: requestId, apiServiceAccount: false },
      include: commonPopulation,
    });
  } else if (getAllowedIdpsForApprover(session).length > 0) {
    const teamIdsLiteral = getMyTeamsLiteral(session.user.id);
    return await models.request.findOne({
      where: {
        id: requestId,
        apiServiceAccount: false,
        [Op.or]: [
          {
            [Op.or]: [
              {
                usesTeam: true,
                teamId: {
                  [Op.in]: sequelize.literal(`(${teamIdsLiteral})`),
                },
              },
              {
                usesTeam: false,
                userId: session.user.id,
              },
            ],
          },
          {
            devIdps: { [Op.overlap]: getAllowedIdpsForApprover(session) },
          },
        ],
      },
      include: commonPopulation,
    });
  }

  return getMyOrTeamRequest(session.user.id, requestId, roles);
};

export const getIntegrationsByTeam = async (
  teamId: number,
  serviceType?: string,
  attributes?: string[],
  options?: { raw: boolean },
) => {
  const where: any = { teamId, apiServiceAccount: false, archived: false };
  if (serviceType) where.serviceType = serviceType;
  return models.request.findAll({
    where,
    attributes,
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
    attributes: {
      include: [[sequelize.literal(getUserTeamRole(user.id)), 'userTeamRole']],
    },
    ...options,
  });
};

export const getIntegrationById = async (
  integrationId: number,
  attributes: string[] = ['id', 'clientId', 'environments', 'teamId', 'devIdps', 'lastChanges'],
  options = { raw: true },
) => {
  return await models.request.findOne({
    where: { id: integrationId, apiServiceAccount: false, archived: false },
    attributes,
    ...options,
  });
};

export const getIntegrationByIdAndTeam = (integrationId: number, teamId: number, options = { raw: true }) => {
  return models.request.findOne({
    where: { id: integrationId, teamId, apiServiceAccount: false, archived: false },
    ...options,
  });
};

export const getIntegrationByClientId = (clientId: string, options = { raw: true }) => {
  return models.request.findOne({
    where: { clientId, apiServiceAccount: false, archived: false },
    ...options,
  });
};

export const canUpdateRequestByUserId = async (userId: number, requestId: number) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId, ['admin', 'member']);
  where.id = requestId;
  const editableRequest = await models.request.findOne({
    where,
    archived: false,
    apiServiceAccount: false,
  });
  if (!editableRequest) return false;
  return true;
};
