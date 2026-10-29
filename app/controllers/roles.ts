import { Permission } from '@sso/authz';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import { canCreateOrDeleteRoles } from '@app/helpers/permissions';
import {
  listClientRoles,
  createRole,
  deleteRole,
  findClientRole,
  NewRole,
  setCompositeClientRoles,
  getCompositeClientRoles,
} from '../keycloak/users';
import { models } from '@app/shared/sequelize/models/models';
import { destroyRequestRole, createCompositeRolesDB } from '@app/queries/roles';
import createHttpError from 'http-errors';
import uniq from 'lodash/uniq';
import { Session } from '@app/shared/interfaces';
import { Integration } from '@app/interfaces/Request';
import {
  isNotFoundInMfa,
  planRoleReplication,
  previewRoleReplication,
  RoleReplicationResultRow,
} from '@app/keycloak/roleReplication';
import { audit } from '@app/queries/event';
import { Environment, isEnvironment, roleMappingTarget, roleOperation } from '@sso/audit';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'controllers/roles' });

// The integration a role operation targets, or 403. Writing operations keep
// the canCreateOrDeleteRoles status guard after this until the transition
// table replaces it.
const authorizedIntegration = async (
  session: Session,
  integrationId: number,
  permission: Permission,
  denied: string,
): Promise<Integration & { id: number }> => {
  const authorized = await authorizeIntegration(session, integrationId, permission);
  if (!authorized) throw new createHttpError.Forbidden(denied);
  return authorized.integration;
};

const assertEnvironment = (environment: string): Environment => {
  if (!isEnvironment(environment)) throw new createHttpError.BadRequest(`invalid environment ${environment}`);
  return environment;
};

export const createClientRole = async (
  session: Session,
  role: { environment: string; integrationId: number; roleName: string },
) => {
  const denied = 'not allowed to create role';
  const integration = await authorizedIntegration(session, role?.integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  const environment = assertEnvironment(role?.environment);
  if (!role?.roleName || role.roleName.length < 2) throw new createHttpError.BadRequest('invalid role name');
  if (await findClientRole(integration, role))
    throw new createHttpError.Conflict(`role ${role.roleName} already exists`);

  const sessionUserId = session?.user?.id as number;
  // The role row mirrors Keycloak, so it is written only once Keycloak has the role.
  return await audit.runAuditedOperation(
    roleOperation('role-create', { requestId: integration.id, environment, roleName: role.roleName }),
    () => createRole(integration, role),
    {
      // A row left behind by an earlier failed create would collide with the unique (name, environment, request).
      onSuccess: async (transaction) => {
        await destroyRequestRole(integration.id, role.roleName, environment, transaction);
        return models.requestRole.create(
          {
            name: role.roleName,
            environment,
            requestId: integration.id,
            createdBy: sessionUserId,
            lastUpdatedBy: sessionUserId,
          },
          { transaction },
        );
      },
    },
  );
};

type BulkCreateResult = {
  env: string;
  success: string[];
  duplicate: string[];
  failure: string[];
  clientNotFound: boolean;
};

/**
 * Creates up to 20 roles across their environments. Roles that already exist, and environments with no
 * client, are reported without being attempted; every other role and environment is its own `role-create`
 * operation under a `role-bulk-create` parent.
 */
export const bulkCreateClientRoles = async (
  session: Session,
  {
    integrationId,
    roles,
  }: {
    integrationId: number;
    roles: NewRole[];
  },
) => {
  const denied = 'not allowed to create role';
  const integration = await authorizedIntegration(session, integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  if (roles.length > 20) throw new createHttpError.TooManyRequests('only 20 roles can be created at a time');
  const sessionUserId = session?.user?.id as number;

  try {
    const results: BulkCreateResult[] = [];
    const attempts: { environment: Environment; roleName: string; result: BulkCreateResult }[] = [];

    for (const environment of ['dev', 'test', 'prod'] as Environment[]) {
      const roleNames = uniq(
        roles.filter((role) => role.envs?.includes(environment) && role.name?.length >= 2).map((role) => role.name),
      );
      const result: BulkCreateResult = {
        env: environment,
        success: [],
        duplicate: [],
        failure: [],
        clientNotFound: false,
      };
      results.push(result);
      if (roleNames.length === 0) continue;

      let existing: string[];
      try {
        existing = (await listClientRoles(integration, { environment })).map((role) => role.name);
      } catch (err) {
        if (!(err instanceof createHttpError.NotFound)) throw err;
        result.clientNotFound = true;
        result.failure = roleNames;
        continue;
      }

      for (const roleName of roleNames) {
        if (existing.includes(roleName)) result.duplicate.push(roleName);
        else attempts.push({ environment, roleName, result });
      }
    }

    const outcomes = await audit.runAuditedBatch(
      {
        action: 'role-bulk-create',
        requestId: integration.id,
        details: { roleNames: uniq(attempts.map(({ roleName }) => roleName)) },
      },
      attempts.map(({ environment, roleName }) => ({
        operation: roleOperation('role-create', { requestId: integration.id, environment, roleName }),
        call: () => createRole(integration, { environment, integrationId, roleName }),
        onSuccess: async (transaction) => {
          await destroyRequestRole(integration.id, roleName, environment, transaction);
          await models.requestRole.create(
            {
              name: roleName,
              environment,
              requestId: integration.id,
              createdBy: sessionUserId,
              lastUpdatedBy: sessionUserId,
            },
            { transaction },
          );
        },
      })),
    );

    outcomes.forEach((outcome, index) => {
      const { roleName, result } = attempts[index];
      (outcome.status === 'fulfilled' ? result.success : result.failure).push(roleName);
    });
    return results;
  } catch (err) {
    log.error({ err }, 'bulkCreateClientRoles');
    throw new createHttpError.UnprocessableEntity('unable to create roles');
  }
};

export const getClientRole = async (session: Session, role: any) => {
  const integration = await authorizedIntegration(
    session,
    role?.integrationId,
    'roles:read',
    'not allowed to read role',
  );
  return await findClientRole(integration, role);
};

export const listRoles = async (session: Session, role: any) => {
  const integration = await authorizedIntegration(
    session,
    role?.integrationId,
    'roles:read',
    'not allowed to read roles',
  );
  return await listClientRoles(integration, role);
};

export const deleteRoles = async (session: Session, role: any) => {
  const denied = 'not allowed to delete role';
  const integration = await authorizedIntegration(session, role?.integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  const environment = assertEnvironment(role?.environment);
  if (!(await findClientRole(integration, role)))
    throw new createHttpError.NotFound(`role ${role?.roleName} not found`);

  await audit.runAuditedOperation(
    roleOperation('role-delete', { requestId: integration.id, environment, roleName: role.roleName }),
    () => deleteRole(integration, role),
    { onSuccess: (transaction) => destroyRequestRole(integration.id, role.roleName, environment, transaction) },
  );
};

export const setCompositeRoles = async (
  session: Session,
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
  const denied = 'not allowed to create composite roles';
  const integration = await authorizedIntegration(session, integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  const env = assertEnvironment(environment);
  if (!Array.isArray(compositeRoleNames)) throw new createHttpError.BadRequest('invalid composite roles');

  // getCompositeClientRoles 404s on a missing role; each named composite must exist too.
  const current = await getCompositeClientRoles(integration, { environment, roleName });
  for (const name of compositeRoleNames) {
    if (!(await findClientRole(integration, { environment, roleName: name }))) {
      throw new createHttpError.NotFound(`role ${name} not found`);
    }
  }

  // Keycloak replaces the whole set; the event records what that changes.
  return await audit.runAuditedOperation(
    roleOperation(
      'role-composite-update',
      { requestId: integration.id, environment: env, roleName },
      {
        add: compositeRoleNames.filter((name) => !current.includes(name)),
        remove: current.filter((name) => !compositeRoleNames.includes(name as string)) as string[],
      },
    ),
    () => setCompositeClientRoles(integration, { environment, roleName, compositeRoleNames }),
    {
      onSuccess: (transaction, result) =>
        createCompositeRolesDB(
          result?.name as string,
          result?.composites as string[],
          integration.id,
          environment,
          transaction,
        ),
    },
  );
};

export const listCompositeRoles = async (session: Session, role: any) => {
  const integration = await authorizedIntegration(
    session,
    role?.integrationId,
    'roles:read',
    'not allowed to read roles',
  );
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
  session: Session,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
) => {
  const denied = 'not allowed to replicate roles';
  const integration = await authorizedIntegration(session, integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  assertRoleReplicationSupported(integration, environment);
  return await previewRoleReplication(integration, { environment, roleName });
};

/**
 * Runs the "Replicate Roles" (idir -> MFA) operation. If `roleName` is omitted, replicates every client role
 * in the environment ("Replicate All Roles"). Requires the manage-roles permission since it creates
 * Keycloak users and grants client role mappings.
 *
 * Recorded as a `role-replicate` parent with one `role-assign` child per user and role still to replicate,
 * all stored before anything is granted: a crash part-way leaves exactly the unfinished grants unanswered,
 * and rerunning skips everyone already replicated. Users who already hold the role, and users with no Azure
 * IDIR account to replicate to, are not changes and are not recorded.
 */
export const replicateRoleMfa = async (
  session: Session,
  { environment, integrationId, roleName }: { environment: string; integrationId: number; roleName?: string },
): Promise<RoleReplicationResultRow[]> => {
  const denied = 'not allowed to replicate roles';
  const integration = await authorizedIntegration(session, integrationId, 'roles:write', denied);
  if (!canCreateOrDeleteRoles(integration)) throw new createHttpError.Forbidden(denied);
  const env = assertEnvironment(environment);
  assertRoleReplicationSupported(integration, environment);

  const plan = await planRoleReplication(integration, { environment, roleName });

  const outcomes = await audit.runAuditedBatch(
    {
      action: 'role-replicate',
      requestId: integration.id,
      environment: env,
      ...(roleName ? { target: { type: 'role', id: roleName } } : {}),
      details: { roleName: roleName || '*', sourceIdp: 'idir', targetIdp: 'azureidir' },
    },
    plan.pending.map((row) => {
      const { targetType, targetId } = roleMappingTarget(row.mfaUsername);
      return {
        operation: {
          action: 'role-assign' as const,
          requestId: integration.id,
          environment: env,
          target: { type: targetType, id: targetId },
          details: { roleName: row.role, replicatedFrom: row.idirUsername },
        },
        call: () => plan.replicate(row),
      };
    }),
    { parent: 'always', concurrency: 8 },
  );

  const attempted = outcomes.map((outcome, index): RoleReplicationResultRow => {
    const { idirUsername, guid, role } = plan.pending[index];
    if (outcome.status === 'fulfilled') return { idirUsername, guid, role, status: 'REPLICATED' };
    return isNotFoundInMfa(outcome.reason)
      ? {
          idirUsername,
          guid,
          role,
          status: 'NOT_FOUND_IN_MFA',
          detail: 'no matching azureidir account found via MS Graph',
        }
      : { idirUsername, guid, role, status: 'ERROR' };
  });
  return [...plan.alreadyReplicated, ...plan.notFound, ...attempted];
};
