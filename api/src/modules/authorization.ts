import createHttpError from 'http-errors';
import { Op, WhereOptions } from 'sequelize';
import models from '@/sequelize/models/models';
import { Action, PRESETS, Permission, Resource, organizationPermissions, permits } from '@sso/authz';

/**
 * Everything enforcement needs to answer for one API account, resolved once per
 * request (well, once per cache TTL) and carried on `req.authz`.
 *
 * An account's authority is its owner's, read live. Nothing is stored per
 * account:
 *
 *   - A team account *is* the team. It holds `team-admin` over every
 *     integration in that team — including one created tomorrow — and nothing
 *     outside it.
 *   - An organization account is the organization. Its reach is the teams
 *     that have consented to the organization; what it may do in each is the
 *     permission set the team consented to, capped per integration by any
 *     override the team has placed under that link.
 *
 * Nothing else is consulted. In particular the team id on the token is not: the
 * owner on the account's own row is the whole answer, and a second source would
 * be a second place to get wrong.
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

export interface OrganizationTeamLink {
  /** What the team consented to for the organization, across the whole team. */
  permissions: Permission[];
  /** Per-integration caps placed under this link, keyed by integration id. */
  overrides: Map<number, Permission[]>;
}

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

const loadAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const account: any = await models.request.findOne({
    where: { clientId: apiClientId, apiServiceAccount: true, archived: false },
    attributes: ['id', 'teamId'],
    raw: true,
  });

  if (!account) return null;

  if (account.teamId !== null && account.teamId !== undefined) {
    return { kind: 'team', apiClientId, apiAccountId: account.id, teamId: account.teamId };
  }

  // An organization account is owned through `requests.organization_id` and
  // resolves to an OrganizationAuthContext from organization_teams and
  // organization_integration_overrides. Until organizations land, an account
  // with no team has no owner and therefore no authority.
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
