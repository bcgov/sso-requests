import createHttpError from 'http-errors';
import { API_ACTIONS, API_RESOURCES, Level, LEVEL_RANK } from '@app/shared/enums';
import { models } from '@app/shared/sequelize/models/models';
import { getOrganizationAccessForIntegration, getOrganizationAccessForIntegrations } from '@app/queries/organization';
import { hasTeamPermission } from '@app/utils/authorize';
import { requiredLevel } from '@app/utils/levels';

type Resource = typeof API_RESOURCES[keyof typeof API_RESOURCES];
type Action = typeof API_ACTIONS[keyof typeof API_ACTIONS];

export interface IntegrationAccessOptions {
  resource: Resource;
  action: Action;
  environment?: string | null;
  everyEnvironment?: boolean;
  nativeTeamPermission?: string;
  includeArchived?: boolean;
}

const plain = (value: any) => (value?.get ? value.get({ plain: true }) : value);

const ENVIRONMENT_PREFIX = /^(dev|test|prod)[A-Z_]/;

const attachOrganizationAccess = (integration: any, organizationAccess: any) => {
  if (!organizationAccess) return integration;
  if (integration?.setDataValue) integration.setDataValue('organizationAccess', organizationAccess);
  else integration.organizationAccess = organizationAccess;
  return integration;
};

const attachNativeRole = (integration: any, role?: string) => {
  if (integration?.setDataValue) integration.setDataValue('userTeamRole', role);
  else integration.userTeamRole = role;
};

export const organizationLevelForEnvironment = (organizationAccess: any, environment?: string | null): Level => {
  if (!organizationAccess) return 'none';
  if (environment) return organizationAccess.environmentLevels?.[environment] ?? organizationAccess.defaultLevel;
  return organizationAccess.effectiveLevel ?? organizationAccess.defaultLevel ?? 'none';
};

export const organizationAccessAllows = (
  organizationAccess: any,
  integration: any,
  options: IntegrationAccessOptions,
) => {
  if (!organizationAccess) return false;
  const required = requiredLevel(options.resource, options.action);
  const environments = plain(integration).environments ?? [];

  if (options.everyEnvironment) {
    const targets = environments.length > 0 ? environments : [null];
    return targets.every(
      (environment: string | null) =>
        LEVEL_RANK[organizationLevelForEnvironment(organizationAccess, environment)] >= LEVEL_RANK[required],
    );
  }

  if (options.environment) {
    return LEVEL_RANK[organizationLevelForEnvironment(organizationAccess, options.environment)] >= LEVEL_RANK[required];
  }

  return LEVEL_RANK[organizationLevelForEnvironment(organizationAccess)] >= LEVEL_RANK[required];
};

export const redactOrganizationRestrictedFields = (integration: any) => {
  const value = plain(integration);
  const organizationAccess = value.organizationAccess;
  if (!organizationAccess || value.userTeamRole) return value;

  const allowedEnvironments = (value.environments ?? []).filter(
    (environment: string) =>
      LEVEL_RANK[organizationLevelForEnvironment(organizationAccess, environment)] >= LEVEL_RANK.viewer,
  );
  const deniedEnvironments = new Set(
    (value.environments ?? []).filter((environment: string) => !allowedEnvironments.includes(environment)),
  );

  const redacted = Object.fromEntries(
    Object.entries(value).filter(([key]) => {
      const match = key.match(ENVIRONMENT_PREFIX);
      return !match || !deniedEnvironments.has(match[1]);
    }),
  );

  return { ...redacted, environments: allowedEnvironments };
};

export const redactOrganizationRestrictedEventDetails = (details: any, integration: any) => {
  const value = plain(integration);
  if (!value.organizationAccess || value.userTeamRole || !details) return details;

  const canReadField = (field: unknown) => {
    if (typeof field !== 'string') return true;
    const match = field.match(ENVIRONMENT_PREFIX);
    if (!match) return true;
    return LEVEL_RANK[organizationLevelForEnvironment(value.organizationAccess, match[1])] >= LEVEL_RANK.viewer;
  };

  if (!Array.isArray(details.changes)) return details;
  return {
    ...details,
    changes: details.changes.filter((change: any) => canReadField(change?.path?.[0])),
  };
};

const getNativeAccess = async (userId: number, integration: any, nativeTeamPermission?: string) => {
  const value = plain(integration);
  if (!value.usesTeam) return value.userId === userId;
  if (!value.teamId) return false;

  const membership = await models.usersTeam.findOne({
    where: { userId, teamId: value.teamId, pending: false },
    attributes: ['role'],
    raw: true,
  });
  if (!membership) return false;

  attachNativeRole(integration, membership.role);
  return nativeTeamPermission ? hasTeamPermission(membership.role, nativeTeamPermission) : true;
};

export const getAuthorizedIntegration = async (
  userId: number,
  integrationId: number,
  options: IntegrationAccessOptions,
) => {
  const where: any = { id: integrationId, apiServiceAccount: false };
  if (!options.includeArchived && options.action !== API_ACTIONS.READ) where.archived = false;

  const integration = await models.request.findOne({
    where,
    include: [
      { model: models.user, required: false },
      { model: models.team, required: false },
    ],
  });
  if (!integration) return null;

  if (await getNativeAccess(userId, integration, options.nativeTeamPermission)) return integration;

  const organizationAccess = await getOrganizationAccessForIntegration(userId, integration);
  if (!organizationAccessAllows(organizationAccess, integration, options)) return null;
  return attachOrganizationAccess(integration, organizationAccess);
};

export const assertAuthorizedIntegration = async (
  userId: number,
  integrationId: number,
  options: IntegrationAccessOptions,
) => {
  const integration = await getAuthorizedIntegration(userId, integrationId, options);
  if (!integration) throw new createHttpError.Forbidden('not allowed to access this integration');
  return integration;
};

export const addOrganizationAccessMetadata = async (userId: number, integrations: any[]) => {
  const accessByIntegration = await getOrganizationAccessForIntegrations(userId, integrations);
  return integrations.map((integration) =>
    attachOrganizationAccess(integration, accessByIntegration.get(plain(integration).id)),
  );
};

export const filterOrganizationAccessibleIntegrations = async (userId: number, integrations: any[]) => {
  const withAccess = await addOrganizationAccessMetadata(userId, integrations);
  return withAccess.filter(
    (integration) => organizationLevelForEnvironment(plain(integration).organizationAccess) !== 'none',
  );
};
