import { Op, WhereOptions } from 'sequelize';
import { Permission, PRESETS, permissionsForTeamRole } from '@sso/authz';
import { resolveAllTeamRoles } from '@app/queries/teamAccess';

/**
 * Every source of *row-level* authority one user holds over integrations,
 * resolved once.
 *
 * Two things read this: the `where` clause of a list query, and the per-row
 * resolve that follows it. They cannot drift, because there is one derivation —
 * which is the whole point. Row visibility belongs in SQL (you cannot paginate a
 * set you filter in JavaScript); field-level rules belong in JavaScript, where
 * they strip fields and never remove rows.
 *
 * Resolving in JavaScript and feeding ids into the query costs a few small
 * membership reads bounded by the number of memberships, not by the number of
 * results — the opposite of a predicate whose cost scales with the result set.
 *
 * App roles and IdP approval are deliberately absent. Neither is row-scoped:
 * an sso-admin reaches integrations through the admin dashboard's own predicate,
 * and an approver's authority is over fields on rows they already see. Putting
 * them here would widen every list.
 */
export interface AccessScope {
  userId: number;
  /** Every accepted membership, role by team id. A pending invitation confers nothing. */
  roleByTeam: Map<number, string>;
  /**
   * Integrations reached individually rather than through a team. Empty until
   * organizations land, when an organization link's per-integration overrides
   * fill it.
   */
  integrationIds: number[];
}

export const resolveAccessScope = async (userId: number): Promise<AccessScope> => ({
  userId,
  roleByTeam: await resolveAllTeamRoles(userId),
  integrationIds: [],
});

/** The teams whose role confers `permission`. */
export const scopedTeamIds = (scope: AccessScope, permission: Permission): number[] =>
  Array.from(scope.roleByTeam.entries())
    .filter(([, role]) => permissionsForTeamRole(role).includes(permission))
    .map(([teamId]) => teamId);

/**
 * The scope read as a query filter: the rows on which this user holds
 * `permission`.
 *
 * Returns `null` when nothing is reachable, which callers must read as "empty
 * result", not "no filter".
 *
 * Each clause is one branch of `resolveAccessForIntegrations` written as SQL,
 * in the same order:
 *
 *   team role      → the teams `scopedTeamIds` admits
 *   personal owner → an integration not using a team, and a draft switched to
 *                    team ownership before a team was picked
 *   individual     → organization overrides, once they exist
 */
export const accessibleIntegrationsWhere = (scope: AccessScope, permission: Permission): WhereOptions | null => {
  const clauses: WhereOptions[] = [];

  const teamIds = scopedTeamIds(scope, permission);
  if (teamIds.length > 0) clauses.push({ usesTeam: true, teamId: { [Op.in]: teamIds } });

  // Personal ownership resolves to team-admin, so it confers exactly what that
  // preset holds — the same test resolveAccessForIntegrations makes per row.
  if (PRESETS['team-admin'].includes(permission)) {
    clauses.push({ usesTeam: false, userId: scope.userId });
    clauses.push({ usesTeam: true, teamId: null, status: 'draft', userId: scope.userId });
  }

  if (scope.integrationIds.length > 0) clauses.push({ id: { [Op.in]: scope.integrationIds } });

  if (clauses.length === 0) return null;
  return { apiServiceAccount: false, [Op.or]: clauses };
};
