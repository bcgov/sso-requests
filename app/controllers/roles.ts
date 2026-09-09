import { getIntegrationById } from '@app/queries/request';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import {
  listClientRoles,
  createRole,
  deleteRole,
  findClientRole,
  NewRole,
  bulkCreateRole,
  setCompositeClientRoles,
  getCompositeClientRoles,
} from '../keycloak/users';
import { models } from '@app/shared/sequelize/models/models';
import { destroyRequestRole, createCompositeRolesDB } from '@app/queries/roles';
import createHttpError from 'http-errors';
import { Session } from '@app/shared/interfaces';
import { Integration } from '@app/interfaces/Request';
import { appPermissions, hasAppPermission, teamPermissions } from '@app/utils/authorize';
import { previewRoleReplication, replicateRolesToMfa } from '@app/keycloak/roleReplication';
import { API_ACTIONS, API_RESOURCES } from '@app/shared/enums';
import { assertAuthorizedIntegration } from '@app/queries/integrationAccess';

const validateIntegration = async (sessionUserId: number, integrationId: number, environment?: string, write = false) =>
  assertAuthorizedIntegration(sessionUserId, integrationId, {
    resource: API_RESOURCES.ROLES,
    action: write ? API_ACTIONS.WRITE : API_ACTIONS.READ,
    environment,
    nativeTeamPermission: write ? teamPermissions.MANAGE_ROLES : undefined,
  });

export const createClientRole = async (
  sessionUserId: number,
  role: { environment: string; integrationId: number; roleName: string },
) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId, role?.environment, true);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to create role');
  const dbRole = await models.requestRole.create({
    name: role?.roleName,
    environment: role?.environment,
    requestId: integration.id,
    createdBy: sessionUserId,
    lastUpdatedBy: sessionUserId,
  });
  if (!dbRole) throw new createHttpError.UnprocessableEntity(`unable to save the role ${role?.roleName}`);
  return await createRole(integration, role);
};

export const bulkCreateClientRoles = async (
  sessionUserId: number,
  {
    integrationId,
    roles,
  }: {
    integrationId: number;
    roles: NewRole[];
  },
) => {
  if (roles.length === 0) throw new createHttpError.BadRequest('at least one role is required');
  const environments = Array.from(new Set(roles.flatMap((role) => role.envs)));
  const authorizedIntegrations = await Promise.all(
    environments.map((environment) => validateIntegration(sessionUserId, integrationId, environment, true)),
  );
  const integration = authorizedIntegrations[0];

  try {
    if (roles.length > 20) throw new createHttpError.TooManyRequests('only 20 roles can be created at a time');

    const envResults = await bulkCreateRole(integration, roles);

    if (envResults.length > 0) {
      for (const res of envResults) {
        if (res?.success.length > 0) {
          for (const role of res.success || []) {
            await models.requestRole.create({
              name: role,
              environment: res.env,
              requestId: integrationId,
              createdBy: sessionUserId,
              lastUpdatedBy: sessionUserId,
            });
          }
        }
      }
    }
    return envResults;
  } catch (err) {
    console.error('bulkCreateClientRoles', err);
    throw new createHttpError.UnprocessableEntity('unable to create roles');
  }
};

export const getClientRole = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId, role?.environment);
  return await findClientRole(integration, role);
};

export const listRoles = async (session: Session, role: any) => {
  let integration: Integration;
  if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES))
    integration = await getIntegrationById(role?.integrationId);
  else integration = await validateIntegration(session?.user?.id as number, role?.integrationId, role?.environment);
  return await listClientRoles(integration, role);
};

export const deleteRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId, role?.environment, true);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to delete role');

  await deleteRole(integration, role);

  const deletedRole = await getClientRole(sessionUserId, role);

  if (!deletedRole) {
    await destroyRequestRole(integration?.id, role?.roleName, role?.environment);
  }

  return;
};

export const setCompositeRoles = async (
  sessionUserId: number,
  {
    environment,
    integrationId,
    roleName,
    compositeRoleNames,
  }: {
    environment: string;
    integrationId: number;
    roleName: string;
    compositeRoleNames: string[];
  },
) => {
  const integration = await validateIntegration(sessionUserId, integrationId, environment, true);
  if (!canCreateOrDeleteRoles(integration))
    throw new createHttpError.Forbidden('not allowed to create composite roles');

  const result = await setCompositeClientRoles(integration, {
    environment,
    roleName,
    compositeRoleNames,
  });

  await createCompositeRolesDB(result?.name as string, result?.composites as string[], integration?.id, environment);
  return result;
};

export const listCompositeRoles = async (session: Session, role: any) => {
  let integration: Integration;
  if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES))
    integration = await getIntegrationById(role?.integrationId);
  else integration = await validateIntegration(session?.user?.id as number, role?.integrationId, role?.environment);
  return await getCompositeClientRoles(integration, {
    environment: role?.environment,
    roleName: role?.roleName,
  });
};

/**
 * Both idir and azureidir must be enabled for the environment for a "Replicate Roles" (idir -> MFA)
 * request to make sense - enforced here as defense in depth beyond the frontend's own IDP gating.
 */
const assertRoleReplicationSupported = (integration: Integration, environment: string) => {
  const idps = (integration['devIdps'] || []) as string[];
  if (!idps.includes('idir') || !idps.includes('azureidir')) {
    throw new createHttpError.BadRequest(
      `role replication requires both idir and azureidir to be enabled for the ${environment} environment`,
    );
  }
};

/**
 * Preview counts for the "Replicate Roles" (idir -> MFA) confirmation modal - how many idir users hold
 * the role(s), how many are already replicated, and how many would be attempted. Does not mutate
 * anything, but since it previews a role-management action, it requires the same manage-roles
 * permission as the mutating replicate endpoint.
 */
export const previewRoleMfaReplication = async (
  sessionUserId: number,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
) => {
  const integration = await validateIntegration(sessionUserId, integrationId, environment, true);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to replicate roles');
  assertRoleReplicationSupported(integration, environment);
  return await previewRoleReplication(integration, { environment, roleName });
};

/**
 * Runs the "Replicate Roles" (idir -> MFA) operation. If `roleName` is omitted, replicates every client role
 * in the environment ("Replicate All Roles"). Requires the manage-roles permission since it creates
 * Keycloak users and grants client role mappings.
 */
export const replicateRoleMfa = async (
  sessionUserId: number,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
) => {
  const integration = await validateIntegration(sessionUserId, integrationId, environment, true);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to replicate roles');
  assertRoleReplicationSupported(integration, environment);
  return await replicateRolesToMfa(integration, { environment, roleName });
};
