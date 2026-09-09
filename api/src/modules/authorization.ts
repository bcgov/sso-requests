import createHttpError from 'http-errors';
import { Op } from 'sequelize';
import models from '@/sequelize/models/models';
import {
  Action,
  Environment,
  OrganizationRole,
  Resource,
  isValidEnvironment,
  levelGrants,
  minLevel,
} from '@/constants';

// A single row of authority. NULL means "any" on both integrationId and
// environment, and a row with neither a team nor an integration is malformed.
export interface Grant {
  teamId: number | null;
  integrationId: number | null;
  environment: string | null;
  level: OrganizationRole;
}

export interface AuthContext {
  apiClientId: string;
  apiAccountId: number;
  teamId: number | null;
  organizationId: number | null;
  grants: Grant[];
  // Absent for a team-owned account, which is bounded by nothing but its own
  // grants. Present (possibly empty) for an organization account, where an
  // empty list means no team has consented to anything.
  ceilings: Grant[] | null;
}

export interface GrantRequirement {
  resource: Resource;
  action: Action;
  environment?: string;
}

// Authorization is resolved server-side on every request rather than carried in
// the token, so permission changes and revocations take effect within one TTL
// instead of requiring the account's Keycloak client to be re-provisioned.
const CACHE_TTL_MS = parseInt(process.env.API_AUTHZ_CACHE_TTL_MS || '10000', 10);

const cache = new Map<string, { expiresAt: number; context: AuthContext | null }>();

export const clearAuthContextCache = () => cache.clear();

// The ceiling a team consented to when it joined the organization. Only teams
// that have accepted are included, so an org account can never reach a team
// that is merely invited, and a team that leaves disappears from here at once.
const loadCeilings = async (organizationId: number): Promise<Grant[]> => {
  const links: any[] = await models.organizationTeam.findAll({
    where: { organizationId, pending: false },
    attributes: ['id', 'teamId'],
    raw: true,
  });

  if (links.length === 0) return [];

  const teamByLink = new Map<number, number>(links.map((link) => [link.id, link.teamId]));

  const rows: any[] = await models.organizationTeamCeiling.findAll({
    where: { organizationTeamId: { [Op.in]: Array.from(teamByLink.keys()) } },
    attributes: ['organizationTeamId', 'integrationId', 'environment', 'level'],
    raw: true,
  });

  return rows.map((row) => ({
    teamId: teamByLink.get(row.organizationTeamId)!,
    integrationId: row.integrationId ?? null,
    environment: row.environment ?? null,
    level: row.level,
  }));
};

// Most specific wins: an integration row overrides its team's row, and an
// environment-specific row overrides the all-environment one. An absent row
// falls through to the next rung, which is what makes a team-wide grant cover
// integrations nobody has named; an explicit `none` row does not fall through,
// which is what makes a carve-out possible.
const resolveLevel = (
  rows: Grant[],
  target: { integrationId: number | null; teamId: number | null },
  environment?: string,
): OrganizationRole => {
  const matches = (row: Grant, integrationId: number | null, env: string | null) =>
    row.integrationId === integrationId &&
    row.environment === env &&
    (integrationId !== null || (row.teamId !== null && row.teamId === target.teamId));

  const ladder: [number | null, string | null][] = [];
  if (target.integrationId !== null) {
    if (environment !== undefined) ladder.push([target.integrationId, environment]);
    ladder.push([target.integrationId, null]);
  }
  if (target.teamId !== null) {
    if (environment !== undefined) ladder.push([null, environment]);
    ladder.push([null, null]);
  }

  for (const [integrationId, env] of ladder) {
    const row = rows.find((candidate) => matches(candidate, integrationId, env));
    if (row) return row.level;
  }

  return 'none';
};

// An organization's authority over a team is whatever the team consented to.
// It is applied at request time rather than at grant-creation time so that
// narrowing a ceiling takes effect immediately without rewriting any grant.
export const effectiveLevel = (
  authz: AuthContext,
  integration: { id: number | null; teamId: number | null },
  environment?: string,
): OrganizationRole => {
  const target = { integrationId: integration.id, teamId: integration.teamId };
  const granted = resolveLevel(authz.grants, target, environment);
  if (authz.ceilings === null) return granted;
  return minLevel(granted, resolveLevel(authz.ceilings, target, environment));
};

const loadAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const account: any = await models.request.findOne({
    where: { clientId: apiClientId, apiServiceAccount: true, archived: false },
    attributes: ['id', 'teamId', 'organizationId'],
    raw: true,
  });

  if (!account) return null;

  const rows: any[] = await models.apiAccountGrant.findAll({
    where: { apiAccountId: account.id },
    attributes: ['teamId', 'integrationId', 'environment', 'level'],
    raw: true,
  });

  const grants: Grant[] = rows.map((row) => ({
    teamId: row.teamId ?? null,
    integrationId: row.integrationId ?? null,
    environment: row.environment ?? null,
    level: row.level,
  }));

  const organizationId = account.organizationId ?? null;

  return {
    apiClientId,
    apiAccountId: account.id,
    teamId: account.teamId ?? null,
    organizationId,
    ceilings: organizationId === null ? null : await loadCeilings(organizationId),
    grants,
  };
};

export const getAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const cached = cache.get(apiClientId);
  if (cached && cached.expiresAt > Date.now()) return cached.context;

  const context = await loadAuthContext(apiClientId);
  cache.set(apiClientId, { expiresAt: Date.now() + CACHE_TTL_MS, context });
  return context;
};

export const assertValidEnvironment = (environment: unknown): Environment => {
  if (!isValidEnvironment(environment)) {
    throw new createHttpError.BadRequest('invalid environment');
  }
  return environment;
};

export const hasGrant = (
  authz: AuthContext,
  integration: { id: number; teamId: number | null },
  requirement: GrantRequirement,
) => {
  if (requirement.environment !== undefined) assertValidEnvironment(requirement.environment);
  const level = effectiveLevel(authz, integration, requirement.environment);
  return levelGrants(level, requirement.resource, requirement.action);
};

// Out-of-scope integrations are indistinguishable from ones that do not exist,
// matching the behaviour of the team-scoped queries this replaced.
export const assertGrant = (
  authz: AuthContext,
  integration: { id: number; teamId: number | null },
  requirement: GrantRequirement,
) => {
  if (!hasGrant(authz, integration, requirement)) {
    throw new createHttpError[404](`integration #${integration.id} not found`);
  }
};

// Reduces the resolved levels to a query filter, so listing never enumerates
// integrations the account cannot reach. Every integration named anywhere is
// resolved individually, because such a row may either widen a team the account
// otherwise lacks or carve a hole in one it has.
export const accessibleIntegrationsWhere = (authz: AuthContext, requirement: GrantRequirement) => {
  const rows = authz.ceilings === null ? authz.grants : authz.grants.concat(authz.ceilings);

  const teamIds = new Set<number>();
  const named = new Map<number, number | null>();

  for (const row of rows) {
    if (row.teamId !== null) teamIds.add(row.teamId);
    if (row.integrationId !== null) named.set(row.integrationId, row.teamId ?? null);
  }

  const satisfies = (level: OrganizationRole) => levelGrants(level, requirement.resource, requirement.action);

  const goodTeams: number[] = [];
  for (const teamId of Array.from(teamIds)) {
    if (satisfies(effectiveLevel(authz, { id: null, teamId }, requirement.environment))) goodTeams.push(teamId);
  }

  const goodIntegrations: number[] = [];
  const blockedIntegrations: number[] = [];
  for (const [integrationId, teamId] of Array.from(named.entries())) {
    if (satisfies(effectiveLevel(authz, { id: integrationId, teamId }, requirement.environment)))
      goodIntegrations.push(integrationId);
    else blockedIntegrations.push(integrationId);
  }

  const clauses: any[] = [];
  if (goodTeams.length > 0) {
    clauses.push(
      blockedIntegrations.length > 0
        ? { teamId: { [Op.in]: goodTeams }, id: { [Op.notIn]: blockedIntegrations } }
        : { teamId: { [Op.in]: goodTeams } },
    );
  }
  if (goodIntegrations.length > 0) clauses.push({ id: { [Op.in]: goodIntegrations } });

  if (clauses.length === 0) return null;
  return clauses.length === 1 ? clauses[0] : { [Op.or]: clauses };
};
