import { findAllowedIntegrationInfo, getIntegrationById } from '@app/queries/request';
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
import { appPermissions, hasAppPermission } from '@app/utils/authorize';
import { previewRoleSync, syncRolesToMfa } from '@app/keycloak/roleSync';

const validateIntegration = async (sessionUserId: number, integrationId: number) => {
  return await findAllowedIntegrationInfo(sessionUserId, integrationId);
};

export const createClientRole = async (
  sessionUserId: number,
  role: { environment: string; integrationId: number; roleName: string },
) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
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
  try {
    const integration = await validateIntegration(sessionUserId, integrationId);
    if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to create role');

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
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
  return await findClientRole(integration, role);
};

export const listRoles = async (session: Session, role: any) => {
  let integration: Integration;
  if (hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES))
    integration = await getIntegrationById(role?.integrationId);
  else integration = await validateIntegration(session?.user?.id as number, role?.integrationId);
  return await listClientRoles(integration, role);
};

export const deleteRoles = async (sessionUserId: number, role: any) => {
  const integration = await validateIntegration(sessionUserId, role?.integrationId);
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
  const integration = await validateIntegration(sessionUserId, integrationId);
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
  else integration = await validateIntegration(session?.user?.id as number, role?.integrationId);
  return await getCompositeClientRoles(integration, {
    environment: role?.environment,
    roleName: role?.roleName,
  });
};

/**
 * Both idir and azureidir must be enabled for the environment for a "Sync Roles" (idir -> MFA)
 * request to make sense - enforced here as defense in depth beyond the frontend's own IDP gating.
 */
const assertRoleSyncSupported = (integration: Integration, environment: string) => {
  const idps = (integration['devIdps'] || []) as string[];
  if (!idps.includes('idir') || !idps.includes('azureidir')) {
    throw new createHttpError.BadRequest(
      `role sync requires both idir and azureidir to be enabled for the ${environment} environment`,
    );
  }
};

/**
 * Preview counts for the "Sync Roles" (idir -> MFA) confirmation modal - how many idir users hold
 * the role(s), how many are already synced, and how many would be attempted. Does not mutate
 * anything, but since it previews a role-management action, it requires the same manage-roles
 * permission as the mutating sync endpoint.
 */
export const previewRoleMfaSync = async (
  sessionUserId: number,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
) => {
  const integration = await validateIntegration(sessionUserId, integrationId);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to sync roles');
  assertRoleSyncSupported(integration, environment);
  return await previewRoleSync(integration, { environment, roleName });
};

/**
 * Runs the "Sync Roles" (idir -> MFA) operation. If `roleName` is omitted, syncs every client role
 * in the environment ("Sync All Roles"). Requires the manage-roles permission since it creates
 * Keycloak users and grants client role mappings.
 */
export const syncRoleMfa = async (
  sessionUserId: number,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
) => {
  const integration = await validateIntegration(sessionUserId, integrationId);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden('not allowed to sync roles');
  assertRoleSyncSupported(integration, environment);
  return await syncRolesToMfa(integration, { environment, roleName });
};
