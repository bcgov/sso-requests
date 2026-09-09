import { Op } from 'sequelize';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { Session, User } from '@app/shared/interfaces';
import { getAllowedIdpsForApprover } from '@app/utils/helpers';
import { getMyTeamsLiteral, getUserTeamRole } from '@app/queries/literals';
import { hasAppPermission, appPermissions, teamPermissions } from '@app/utils/authorize';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';
import {
  addOrganizationAccessMetadata,
  filterOrganizationAccessibleIntegrations,
  getAuthorizedIntegration,
} from '@app/queries/integrationAccess';
import { getOrganizationTeamIdsForUser } from '@app/queries/organization';

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

  const nativeIntegrations = await models.request.findAll({
    where,
    attributes: ['id', 'serviceType'],
    ...options,
  });
  const organizationTeamIds = await getOrganizationTeamIdsForUser(userId);
  if (organizationTeamIds.length === 0) return nativeIntegrations;

  const organizationCandidates = await models.request.findAll({
    where: {
      teamId: { [Op.in]: organizationTeamIds },
      usesTeam: true,
      apiServiceAccount: false,
      archived: false,
    },
    attributes: ['id', 'serviceType', 'teamId', 'usesTeam', 'environments'],
    ...options,
  });
  const organizationIntegrations = await filterOrganizationAccessibleIntegrations(userId, organizationCandidates);
  const nativeIds = new Set(nativeIntegrations.map((integration: any) => integration.id));
  return nativeIntegrations.concat(
    organizationIntegrations.filter((integration: any) => !nativeIds.has(integration.id)),
  );
};

export const getMyOrTeamRequest = async (userId: number, requestId: number, roles: string[] = ['member', 'admin']) => {
  const where = getBaseWhereForMyOrTeamIntegrations(userId, roles);
  where.id = requestId;

  const request = await models.request.findOne({
    where,
    include: commonPopulation,
    attributes: {
      include: [[sequelize.literal(getUserTeamRole(userId)), 'userTeamRole']],
    },
  });
  if (request) return addOrganizationAccessMetadata(userId, [request]).then(([result]) => result);

  return getAuthorizedIntegration(userId, requestId, {
    resource: API_RESOURCES.INTEGRATIONS,
    action: API_ACTIONS.READ,
    includeArchived: true,
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

  const integration = await models.request.findOne({
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
  if (integration) return addOrganizationAccessMetadata(userId, [integration]).then(([result]) => result);

  return getAuthorizedIntegration(userId, integrationId, {
    resource: API_RESOURCES.INTEGRATIONS,
    action: API_ACTIONS.READ,
  });
};

export const getAllowedRequest = async (session: Session, requestId: number, roles?: string[]) => {
  if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST)) {
    return models.request.findOne({
      where: { id: requestId, apiServiceAccount: false },
      include: commonPopulation,
    });
  } else if (getAllowedIdpsForApprover(session).length > 0) {
    const teamIdsLiteral = getMyTeamsLiteral(session?.user?.id as number);
    const request = await models.request.findOne({
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
    if (request) return request;
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
  const editableRequest = await getAuthorizedIntegration(userId, requestId, {
    resource: API_RESOURCES.INTEGRATIONS,
    action: API_ACTIONS.WRITE,
    everyEnvironment: true,
    nativeTeamPermission: teamPermissions.UPDATE_REQUEST,
  });
  return !!editableRequest;
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

export const getAllActiveRequests = async (enviroment: string, options?: { raw: boolean }) => {
  const where: any = { apiServiceAccount: false, archived: false, status: 'applied' };
  if (enviroment) {
    where.environments = {
      [Op.overlap]: [enviroment],
    };
  }
  return models.request.findAll({
    where,
    ...options,
  });
};
