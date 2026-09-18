import createHttpError from 'http-errors';
import { Op, WhereOptions } from 'sequelize';
import models from '@/sequelize/models/models';
import { Action, OrganizationLink, PRESETS, Permission, Resource, organizationPermissions, permits } from '@sso/authz';

/**
 * API accounts can be at a team or organization level.
 */
export type AuthContext = TeamAuthContext | OrganizationAuthContext;

export interface TeamAuthContext {
  kind: 'team';
  apiClientId: string;
  apiAccountId: number;
  teamId: number;
}

export interface OrganizationAuthContext {
  kind: 'organization';
  apiClientId: string;
  apiAccountId: number;
  organizationId: number;
  /** Active links only, keyed by team id. A team not present here is out of reach. */
  teams: Map<number, OrganizationTeamLink>;
}

export type OrganizationTeamLink = OrganizationLink;

export interface Requirement {
  resource: Resource;
  action: Action;
}

interface IntegrationRef {
  id: number;
  teamId: number | null;
}

// Authorization is resolved server-side on every request rather than carried in
// the token, so a team leaving an organization or narrowing a link takes effect
// within one TTL instead of requiring the account's Keycloak client to be
// re-provisioned.
const CACHE_TTL_MS = parseInt(process.env.API_AUTHZ_CACHE_TTL_MS || '10000', 10);

const cache = new Map<string, { expiresAt: number; context: AuthContext | null }>();

export const clearAuthContextCache = () => cache.clear();

const loadOrganizationTeams = async (organizationId: number): Promise<Map<number, OrganizationTeamLink>> => {
  // Team level permissions granted to the organization
  const links: any[] = await models.organizationTeam.findAll({
    where: { organizationId, pending: false },
    attributes: ['id', 'teamId', 'permissions'],
    raw: true,
  });

  // Map of team IDs to their base permissions and overrides
  const permissionsByTeam = new Map<number, OrganizationTeamLink>();
  if (links.length === 0) return permissionsByTeam;

  // Check for any specific integration level permission overrides
  const overrides: any[] = await models.organizationIntegrationOverride.findAll({
    where: { organizationTeamId: { [Op.in]: links.map((link) => link.id) } },
    attributes: ['organizationTeamId', 'requestId', 'permissions'],
    raw: true,
  });

  const overridesByLink = new Map<number, Map<number, Permission[]>>(links.map((link) => [link.id, new Map()]));
  for (const override of overrides) {
    overridesByLink.get(override.organizationTeamId)?.set(override.requestId, override.permissions ?? []);
  }

  for (const link of links) {
    permissionsByTeam.set(link.teamId, {
      permissions: link.permissions ?? [],
      overrides: overridesByLink.get(link.id) ?? new Map(),
    });
  }

  return permissionsByTeam;
};

const loadAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const account: any = await models.request.findOne({
    where: { clientId: apiClientId, apiServiceAccount: true, archived: false },
    attributes: ['id', 'teamId', 'organizationId'],
    raw: true,
  });

  if (!account) return null;

  if (account.teamId !== null && account.teamId !== undefined) {
    return { kind: 'team', apiClientId, apiAccountId: account.id, teamId: account.teamId };
  }

  if (account.organizationId !== null && account.organizationId !== undefined) {
    return {
      kind: 'organization',
      apiClientId,
      apiAccountId: account.id,
      organizationId: account.organizationId,
      teams: await loadOrganizationTeams(account.organizationId),
    };
  }

  return null;
};

export const getAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const cached = cache.get(apiClientId);
  if (cached && cached.expiresAt > Date.now()) return cached.context;

  const context = await loadAuthContext(apiClientId);
  cache.set(apiClientId, { expiresAt: Date.now() + CACHE_TTL_MS, context });
  return context;
};

/** What this account may do to one integration. */
export const effectivePermissions = (authz: AuthContext, integration: IntegrationRef): Permission[] => {
  // An integration with no team belongs to a person, and no API account reaches it.
  if (integration.teamId === null) return [];

  switch (authz.kind) {
    case 'team':
      return integration.teamId === authz.teamId ? PRESETS['team-admin'] : [];
    case 'organization': {
      // Looked up through the integration's *current* team, so an override
      // left behind by a team reassignment is never found.
      const link = authz.teams.get(integration.teamId);
      return organizationPermissions(link, link?.overrides.get(integration.id));
    }
  }
};

export const isPermitted = (authz: AuthContext, integration: IntegrationRef, requirement: Requirement) =>
  permits(effectivePermissions(authz, integration), requirement.resource, requirement.action);

// Out-of-scope integrations are indistinguishable from ones that do not exist,
// preserving the behaviour of the team-scoped queries this replaced: reaching
// across teams answered 404, never 403, and never leaked that the row existed.
export const assertPermitted = (authz: AuthContext, integration: IntegrationRef, requirement: Requirement) => {
  if (!isPermitted(authz, integration, requirement)) {
    throw new createHttpError[404](`integration #${integration.id} not found`);
  }
};

/**
 * Reduce the account's authority to a query filter, so listing never enumerates
 * integrations the account cannot reach.
 *
 * The same resolution as `effectivePermissions`, read as a predicate: every
 * integration in a team whose permissions satisfy the requirement, minus those
 * whose override under that team drops it. Returns `null` when nothing is
 * reachable, which callers must read as "empty result", not "no filter".
 */
export const accessibleIntegrationsWhere = (authz: AuthContext, requirement: Requirement): WhereOptions | null => {
  const { resource, action } = requirement;

  switch (authz.kind) {
    case 'team':
      return permits(PRESETS['team-admin'], resource, action) ? { teamId: authz.teamId } : null;
    case 'organization': {
      const clauses: WhereOptions[] = [];
      for (const [teamId, link] of authz.teams) {
        if (!permits(link.permissions, resource, action)) continue;
        // An override lacking the permission drops it whatever the link holds,
        // so the link need not be consulted again here.
        const blocked = Array.from(link.overrides.entries())
          .filter(([, override]) => !permits(override, resource, action))
          .map(([integrationId]) => integrationId);
        clauses.push(blocked.length > 0 ? { teamId, id: { [Op.notIn]: blocked } } : { teamId });
      }
      return clauses.length > 0 ? { [Op.or]: clauses } : null;
    }
  }
};
