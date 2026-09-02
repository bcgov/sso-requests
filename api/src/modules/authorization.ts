import createHttpError from 'http-errors';
import { Op } from 'sequelize';
import models from '@/sequelize/models/models';
import { Action, Environment, Resource, isValidEnvironment } from '@/constants';

export interface Grant {
  teamId: number | null;
  integrationId: number | null;
  resource: string;
  action: string;
  environment: string | null;
}

export interface AuthContext {
  apiClientId: string;
  apiAccountId: number;
  teamId: number | null;
  organizationId: number | null;
  grants: Grant[];
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

const loadAuthContext = async (apiClientId: string): Promise<AuthContext | null> => {
  const account: any = await models.request.findOne({
    where: { clientId: apiClientId, apiServiceAccount: true, archived: false },
    attributes: ['id', 'teamId'],
    raw: true,
  });

  if (!account) return null;

  const grants: any[] = await models.apiAccountGrant.findAll({
    where: { apiAccountId: account.id },
    attributes: ['teamId', 'integrationId', 'resource', 'action', 'environment'],
    raw: true,
  });

  return {
    apiClientId,
    apiAccountId: account.id,
    teamId: account.teamId ?? null,
    organizationId: account.organizationId ?? null,
    grants: grants.map((grant) => ({
      teamId: grant.teamId ?? null,
      integrationId: grant.integrationId ?? null,
      resource: grant.resource,
      action: grant.action,
      environment: grant.environment ?? null,
    })),
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

// A NULL column means "any", so a grant matches when each of its constraints is
// either unset or equal to the value being tested.
const grantMatches = (
  grant: Grant,
  integration: { id: number; teamId: number | null },
  requirement: GrantRequirement,
) => {
  // A grant constraining neither team nor integration is not produced by any
  // code path; treat it as malformed and deny rather than as a wildcard.
  if (grant.teamId === null && grant.integrationId === null) return false;
  if (grant.resource !== requirement.resource) return false;
  if (grant.action !== requirement.action) return false;
  if (grant.environment !== null && grant.environment !== requirement.environment) return false;
  if (grant.integrationId !== null && grant.integrationId !== integration.id) return false;
  if (grant.teamId !== null && grant.teamId !== integration.teamId) return false;
  return true;
};

export const hasGrant = (
  authz: AuthContext,
  integration: { id: number; teamId: number | null },
  requirement: GrantRequirement,
) => {
  if (requirement.environment !== undefined) assertValidEnvironment(requirement.environment);
  return authz.grants.some((grant) => grantMatches(grant, integration, requirement));
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

// Reduces the grant set to a query filter, so listing never enumerates
// integrations the account cannot reach.
export const accessibleIntegrationsWhere = (authz: AuthContext, requirement: GrantRequirement) => {
  const applicable = authz.grants.filter(
    (grant) =>
      grant.resource === requirement.resource &&
      grant.action === requirement.action &&
      (grant.environment === null || grant.environment === requirement.environment),
  );

  if (applicable.length === 0) return null;

  const teamIds = new Set<number>();
  const integrationIds = new Set<number>();

  for (const grant of applicable) {
    if (grant.integrationId !== null) integrationIds.add(grant.integrationId);
    else if (grant.teamId !== null) teamIds.add(grant.teamId);
  }

  const clauses: any[] = [];
  if (teamIds.size > 0) clauses.push({ teamId: { [Op.in]: [...teamIds] } });
  if (integrationIds.size > 0) clauses.push({ id: { [Op.in]: [...integrationIds] } });

  if (clauses.length === 0) return null;
  return clauses.length === 1 ? clauses[0] : { [Op.or]: clauses };
};
