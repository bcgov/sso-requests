import { chunk, uniq } from 'lodash';
import createHttpError from 'http-errors';
import { getAdminClient } from './adminClient';
import { createAzureIdirUser } from './users';
import { verifyAzureIdirAccountByGuid } from '@app/utils/graph-api';
import { Integration } from '@app/interfaces/Request';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'keycloak/roleReplication' });

const MAX_CLIENT_ROLE_COUNT = 5000;
// Small parallel batches so we don't hammer Keycloak/MS Graph at once.
const REPLICATION_BATCH_SIZE = 8;

export type RoleReplicationStatus = 'REPLICATED' | 'ALREADY_REPLICATED' | 'NOT_FOUND_IN_MFA' | 'ERROR';

export interface RoleReplicationResultRow {
  idirUsername: string;
  guid: string;
  role: string;
  status: RoleReplicationStatus;
  detail?: string;
}

export interface RoleReplicationPreview {
  role: string;
  total: number;
  alreadyReplicated: number;
  toAttempt: number;
}

const getClient = async (kcAdminClient: any, clientId?: string) => {
  const clients = await kcAdminClient.clients.find({ realm: 'standard', clientId, max: 1 });
  if (clients.length === 0) throw new createHttpError.NotFound(`client ${clientId} not found`);
  return clients[0];
};

const listAllRoleNames = async (kcAdminClient: any, client: any) => {
  const roles: any[] = await kcAdminClient.clients.listRoles({
    realm: 'standard',
    id: client.id,
    first: 0,
    max: MAX_CLIENT_ROLE_COUNT,
  });
  return roles.map((role) => role.name).filter((name): name is string => Boolean(name));
};

/** List the `idir` (non-MFA) users assigned to a given client role. */
const listIdirUsersForRole = async (kcAdminClient: any, client: any, roleName: string) => {
  const roleNames = await listAllRoleNames(kcAdminClient, client);
  if (!roleNames.includes(roleName)) throw new createHttpError.NotFound(`role ${roleName} not found`);

  const users: any[] = await kcAdminClient.clients.findUsersWithRole({
    realm: 'standard',
    id: client.id,
    roleName,
    first: 0,
    max: MAX_CLIENT_ROLE_COUNT,
  });

  return users.filter((user) => user.username?.endsWith('@idir'));
};

type AzureIdirAccount = NonNullable<Awaited<ReturnType<typeof verifyAzureIdirAccountByGuid>>>;

/**
 * Resolve the `azureidir` counterpart of an `idir` user by GUID. If the user doesn't exist yet in
 * Keycloak, verify against MS Graph (unless the account was already looked up) and create it (mirrors
 * the existing "roles-new" provisioning flow). Returns `null` (does not throw) if there's no matching
 * Azure IDIR account - this is a normal "not found" outcome, not an error.
 */
const resolveMfaUser = async (environment: string, kcAdminClient: any, guid: string, known?: AzureIdirAccount) => {
  const mfaUsername = `${guid}@azureidir`;
  const existing = await kcAdminClient.users.find({ realm: 'standard', username: mfaUsername, max: 1 });
  if (existing.length > 0) return existing[0];

  const account = known ?? (await verifyAzureIdirAccountByGuid(guid));
  if (!account) return null;
  return await createAzureIdirUser({
    environment,
    guid,
    idirGuid: guid,
    userId: account.userId || guid,
    idp: 'azureidir',
    email: account.email as string,
    firstName: account.firstName as string,
    lastName: account.lastName as string,
    displayName: account.displayName as string,
    upn: account.userPrincipalName as string,
  });
};

/** Derive the IDIR GUID and display username from a keycloak `idir` user representation. */
const getIdirUserIdentity = (user: any) => {
  const guid = (user.attributes?.idir_user_guid?.[0] || user.username.split('@')[0]).toLowerCase();
  const idirUsername = user.attributes?.idir_username?.[0] || user.username;
  return { guid, idirUsername };
};

/**
 * Replicate (or preview replicating) a single client role from `idir` users to their `azureidir`
 * equivalents, for the given list of idir users. Additive-only: never removes/touches roles that
 * only exist on the MFA side. Continues past per-user failures (recorded as `ERROR`) rather than
 * aborting the whole batch.
 */
const replicateRoleForUsers = async (
  environment: string,
  kcAdminClient: any,
  client: any,
  roleName: string,
  idirUsers: any[],
  dryRun: boolean,
): Promise<RoleReplicationResultRow[]> => {
  const results: RoleReplicationResultRow[] = [];
  const batches = chunk(idirUsers, REPLICATION_BATCH_SIZE);

  for (const batch of batches) {
    const batchResults = await Promise.all(
      batch.map(async (user): Promise<RoleReplicationResultRow> => {
        const { guid, idirUsername } = getIdirUserIdentity(user);
        const base = { idirUsername, guid, role: roleName };

        try {
          let mfaUser: any = null;
          if (dryRun) {
            // Cheap check only - don't verify/create against MS Graph during a preview.
            const existing = await kcAdminClient.users.find({
              realm: 'standard',
              username: `${guid}@azureidir`,
              max: 1,
            });
            mfaUser = existing[0] || null;
          } else {
            mfaUser = await resolveMfaUser(environment, kcAdminClient, guid);
          }

          if (!mfaUser) {
            return {
              ...base,
              status: 'NOT_FOUND_IN_MFA',
              detail: 'no matching azureidir account found via MS Graph',
            };
          }

          const existingRoles: any[] = await kcAdminClient.users.listClientRoleMappings({
            realm: 'standard',
            id: mfaUser.id,
            clientUniqueId: client.id,
          });

          if (existingRoles.some((role) => role.name === roleName)) {
            return { ...base, status: 'ALREADY_REPLICATED' };
          }

          if (dryRun) {
            return { ...base, status: 'REPLICATED', detail: 'will be attempted' };
          }

          const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName });
          if (!role) throw new createHttpError.NotFound(`role ${roleName} not found`);

          await kcAdminClient.users.addClientRoleMappings({
            realm: 'standard',
            id: mfaUser.id,
            clientUniqueId: client.id,
            roles: [{ id: role.id, name: role.name }],
          });

          return { ...base, status: 'REPLICATED' };
        } catch (err: any) {
          log.error({ err }, 'error replicating role');
          return { ...base, status: 'ERROR' };
        }
      }),
    );
    results.push(...batchResults);
  }

  return results;
};

const resolveRoleNames = async (kcAdminClient: any, client: any, roleName?: string) => {
  if (roleName) return [roleName];
  return listAllRoleNames(kcAdminClient, client);
};

/**
 * Compute counts (without mutating anything) for the confirmation-modal preview: how many idir
 * users hold each role, how many are already replicated to azureidir, and how many would be
 * attempted. If `roleName` is omitted, previews every client role in the environment.
 */
export const previewRoleReplication = async (
  integration: Integration,
  { environment, roleName }: { environment: string; roleName?: string },
): Promise<RoleReplicationPreview[]> => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const client = await getClient(kcAdminClient, integration.clientId);
  const roleNames = await resolveRoleNames(kcAdminClient, client, roleName);

  const previews: RoleReplicationPreview[] = [];
  for (const rName of roleNames) {
    const idirUsers = await listIdirUsersForRole(kcAdminClient, client, rName);
    const rows = await replicateRoleForUsers(environment, kcAdminClient, client, rName, idirUsers, true);
    previews.push({
      role: rName,
      total: rows.length,
      alreadyReplicated: rows.filter((row) => row.status === 'ALREADY_REPLICATED').length,
      toAttempt: rows.filter((row) => row.status !== 'ALREADY_REPLICATED').length,
    });
  }
  return previews;
};

export interface PendingReplication {
  idirUsername: string;
  guid: string;
  role: string;
  /** The azureidir user that would receive the role: deterministic from the GUID, before it exists. */
  mfaUsername: string;
}

/** For a user with no azureidir account: nothing to replicate to, which is an outcome, not a fault. */
const notFoundInMfa = (guid: string) =>
  Object.assign(new createHttpError.NotFound(`no matching azureidir account found via MS Graph for ${guid}`), {
    notFoundInMfa: true,
  });

export const isNotFoundInMfa = (err: unknown) => (err as { notFoundInMfa?: boolean })?.notFoundInMfa === true;

/**
 * Works out, without changing anything, who still needs each role replicated: every idir user holding the
 * role whose azureidir counterpart does not already hold it. A user with no azureidir user in Keycloak yet
 * is looked up in MS Graph once; one with no Azure IDIR account at all has nothing to replicate to and is
 * reported in `notFound` rather than planned. `resolveTargets` then resolves (and if need be creates) each
 * pending GUID's azureidir user, once however many roles it receives, and `replicate` grants one pending
 * row. If `roleName` is omitted, plans every client role.
 */
export const planRoleReplication = async (
  integration: Integration,
  { environment, roleName }: { environment: string; roleName?: string },
) => {
  const { kcAdminClient } = await getAdminClient({ serviceType: 'gold', environment });
  const client = await getClient(kcAdminClient, integration.clientId);
  const roleNames = await resolveRoleNames(kcAdminClient, client, roleName);

  const rows: RoleReplicationResultRow[] = [];
  for (const rName of roleNames) {
    const idirUsers = await listIdirUsersForRole(kcAdminClient, client, rName);
    rows.push(...(await replicateRoleForUsers(environment, kcAdminClient, client, rName, idirUsers, true)));
  }

  // The dry run reports a user with no azureidir user in Keycloak as NOT_FOUND_IN_MFA; MS Graph decides
  // whether one can be created.
  const unresolved = uniq(rows.filter((row) => row.status === 'NOT_FOUND_IN_MFA').map((row) => row.guid));
  const accounts = new Map<string, AzureIdirAccount>();
  for (const batch of chunk(unresolved, REPLICATION_BATCH_SIZE)) {
    await Promise.all(
      batch.map(async (guid) => {
        const account = await verifyAzureIdirAccountByGuid(guid);
        if (account) accounts.set(guid, account);
      }),
    );
  }

  const alreadyReplicated: RoleReplicationResultRow[] = [];
  const notFound: RoleReplicationResultRow[] = [];
  const pending: PendingReplication[] = [];
  for (const row of rows) {
    if (row.status === 'ALREADY_REPLICATED') alreadyReplicated.push(row);
    else if (row.status === 'NOT_FOUND_IN_MFA' && !accounts.has(row.guid)) notFound.push(row);
    else
      pending.push({
        idirUsername: row.idirUsername,
        guid: row.guid,
        role: row.role,
        mfaUsername: `${row.guid}@azureidir`,
      });
  }

  // Grants run concurrently, so one GUID's rows share a single lookup (and creation) of its azureidir user.
  const mfaUsers = new Map<string, Promise<any>>();
  const mfaUserFor = (guid: string) => {
    if (!mfaUsers.has(guid)) mfaUsers.set(guid, resolveMfaUser(environment, kcAdminClient, guid, accounts.get(guid)));
    return mfaUsers.get(guid)!;
  };

  /**
   * Resolves every pending row's azureidir user, moving the rows of a GUID that has none to `notFound`. Run
   * before the grants are recorded, so a user with nothing to replicate to never becomes a change. A lookup
   * that fails stays pending: `replicate` rethrows it, so that grant is recorded as the failure it is.
   */
  const resolveTargets = async () => {
    const missing = new Set<string>();
    for (const batch of chunk(uniq(pending.map((row) => row.guid)), REPLICATION_BATCH_SIZE)) {
      await Promise.all(
        batch.map(async (guid) => {
          if (!(await mfaUserFor(guid).catch(() => true))) missing.add(guid);
        }),
      );
    }
    return {
      pending: pending.filter((row) => !missing.has(row.guid)),
      notFound: [
        ...notFound,
        ...pending
          .filter((row) => missing.has(row.guid))
          .map(
            ({ idirUsername, guid, role }): RoleReplicationResultRow => ({
              idirUsername,
              guid,
              role,
              status: 'NOT_FOUND_IN_MFA',
              detail: 'no matching azureidir account found via MS Graph',
            }),
          ),
      ],
    };
  };

  const replicate = async ({ guid, role: rName }: PendingReplication) => {
    const mfaUser = await mfaUserFor(guid);
    if (!mfaUser) throw notFoundInMfa(guid);

    const role = await kcAdminClient.clients.findRole({ realm: 'standard', id: client.id, roleName: rName });
    if (!role) throw new createHttpError.NotFound(`role ${rName} not found`);

    await kcAdminClient.users.addClientRoleMappings({
      realm: 'standard',
      id: mfaUser.id,
      clientUniqueId: client.id,
      roles: [{ id: role.id!, name: role.name! }],
    });
  };

  return { alreadyReplicated, notFound, pending, resolveTargets, replicate };
};
