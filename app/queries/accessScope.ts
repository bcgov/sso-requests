import { Op, WhereOptions } from 'sequelize';
import { OrganizationLink, Permission, PRESETS, permissionsForTeamRole } from '@sso/authz';
import { resolveAllTeamRoles } from '@app/queries/teamAccess';
import { resolveOrganizationLinks } from '@app/queries/organizationAccess';

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
  /** Every accepted membership, role by team id. */
  roleByTeam: Map<number, string>;
  /**
   * Every team this user reaches through an organization they belong to with permissions granted
   */
  organizationTeams: Map<number, OrganizationLink>;
}

export const resolveAccessScope = async (userId: number): Promise<AccessScope> => ({
  userId,
  roleByTeam: await resolveAllTeamRoles(userId),
  organizationTeams: await resolveOrganizationLinks(userId),
});

/** The teams whose role, or whose consent to an organization this user belongs to, confers `permission`. */
export const scopedTeamIds = (scope: AccessScope, permission: Permission): number[] => {
  const teamIds = new Set<number>();

  Array.from(scope.roleByTeam.entries()).forEach(([teamId, role]) => {
    if (permissionsForTeamRole(role).includes(permission)) teamIds.add(teamId);
  });
  Array.from(scope.organizationTeams.entries()).forEach(([teamId, link]) => {
    if (link.permissions.includes(permission)) teamIds.add(teamId);
  });

  return Array.from(teamIds);
};

export const accessibleIntegrationsWhere = (scope: AccessScope, permission: Permission): WhereOptions | null => {
  const clauses: WhereOptions[] = [];

  // Check which teams the user is in. Add to the where clause if the user's team role allows the requested permission
  const memberTeamIds = Array.from(scope.roleByTeam.entries())
    .filter(([, role]) => permissionsForTeamRole(role).includes(permission))
    .map(([teamId]) => teamId);
  if (memberTeamIds.length > 0) clauses.push({ usesTeam: true, teamId: { [Op.in]: memberTeamIds } });

  // If the user directly owns the integration, they have 'team-admin' permissions over it
  if (PRESETS['team-admin'].includes(permission)) {
    clauses.push(
      { usesTeam: false, userId: scope.userId },
      { usesTeam: true, teamId: null, status: 'draft', userId: scope.userId },
    );
  }

  Array.from(scope.organizationTeams.entries()).forEach(([teamId, link]) => {
    // Team memberships already checked that the user role allows requested permission, so can skip org check.
    if (memberTeamIds.includes(teamId)) return;
    if (!link.permissions.includes(permission)) return;

    const capped = Array.from(link.overrides.entries())
      .filter(([, override]) => !override.includes(permission))
      .map(([integrationId]) => integrationId);

    clauses.push(
      capped.length > 0 ? { usesTeam: true, teamId, id: { [Op.notIn]: capped } } : { usesTeam: true, teamId },
    );
  });

  if (clauses.length === 0) return null;
  return { apiServiceAccount: false, [Op.or]: clauses };
};
