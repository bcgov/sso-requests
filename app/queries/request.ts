import { Op } from 'sequelize';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session, User } from '@app/shared/interfaces';
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
    const teamIdsLiteral = getMyTeamsLiteral(session?.user?.id as number);
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
                userId: session?.user?.id as number,
              },
              {
                usesTeam: true,
                teamId: null,
                status: 'draft',
                userId: session?.user?.id as number,
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

  return getMyOrTeamRequest(session?.user?.id as number, requestId, roles);
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

export const getWhereClauseForAllRequests = (data: {
  searchField: string[];
  searchKey: string;
  status?: string;
  archiveStatus?: string;
  realms?: string[];
  environments?: string[];
  types?: string[];
  devIdps?: string[];
}) => {
  const where: any = {};
  const { searchField, searchKey, status = [], archiveStatus = [], realms, devIdps, environments, types } = data;

  if (searchKey && searchField && searchField.length > 0) {
    where[Op.or] = [];
    searchField.forEach((field) => {
      if (field === 'id') {
        const id = Number(searchKey);
        if (!Number.isNaN(id)) where[Op.or].push({ id });
      } else {
        where[Op.or].push({ [field]: { [Op.iLike]: `%${searchKey}%` } });
      }
    });
  }

  if (status.length > 0) {
    where.status = {
      [Op.in]: status,
    };
  }

  if (archiveStatus.length === 1) {
    where.archived = archiveStatus[0] === 'archived';
  }

  // silver and gold IDPs are in different columns requiring an `and or` query
  if (realms && !devIdps) {
    where.realm = {
      [Op.in]: realms,
    };
  } else if (!realms && devIdps) {
    where.dev_idps = {
      [Op.overlap]: devIdps,
    };
  } else if (realms && devIdps) {
    where[Op.and] = [
      {
        [Op.or]: [{ realm: { [Op.in]: realms } }, { dev_idps: { [Op.overlap]: devIdps } }],
      },
    ];
  }

  if (environments)
    where.environments = {
      [Op.overlap]: environments,
    };

  if (types && types?.length > 0)
    where.serviceType = {
      [Op.in]: types,
    };

  return where;
};
