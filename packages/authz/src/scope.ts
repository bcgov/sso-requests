import { Permission } from './permissions';

/**
 * One row of stored authority — a grant on an API account, or a ceiling a team
 * consented to. It mirrors the database row, where a null scope column means
 * "any".
 *
 * Both scope columns are required rather than optional: "any" is always spelled
 * `null`, never left to an absent property, so there is no second way to say it
 * and no difference between null and undefined to remember.
 */
export interface PermissionRow {
  /** The team this row covers, or null for any team. */
  teamId: number | null;
  /** The integration this row covers, or null for every integration it covers. */
  integrationId: number | null;
  permissions: Permission[];
}

/**
 * Narrow a set of rows to those that can speak about one team. A row applies
 * when it names that team, or when it names no team at all.
 *
 * Callers whose rows arrive already scoped to a single team — the app resolves
 * one organization/team link at a time, and its query has done the narrowing —
 * do not need this. A caller holding rows across several teams at once must
 * apply it before resolving, or one team's grant will answer for another.
 */
export const rowsForTeam = (rows: readonly PermissionRow[], teamId: number | null): PermissionRow[] =>
  rows.filter((row) => row.teamId === null || row.teamId === teamId);

export const resolvePermissions = (rows: readonly PermissionRow[], integrationId: number | null): Permission[] => {
  // Integration level restriction overrides all others and can be returned
  const integrationScopedPermissions = rows.find((row) => row.integrationId === integrationId);
  if (integrationScopedPermissions) return integrationScopedPermissions.permissions ?? [];

  // Team scoped permissions (no integration id) apply if not overriden at the integration level
  const everything = rows.find((row) => row.integrationId === null);
  return everything ? everything.permissions ?? [] : [];
};
