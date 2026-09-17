import {
  OrganizationLink,
  Permission,
  PRESETS,
  organizationPermissions,
  permissionsForTeamRole,
  union,
} from '@sso/authz';
import { models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { commonPermissionsForAppRoles } from '@app/utils/authorize';
import { getAllowedIdpsForApprover } from '@app/utils/helpers';
import { resolveTeamRoles } from '@app/queries/teamAccess';
import { resolveOrganizationLinks } from '@app/queries/organizationAccess';
import { AccessScope } from '@app/queries/accessScope';

// The columns the resolver reads off a request row. A query that selects a
// subset with `attributes:` must still satisfy this, so a missing column is a
// compile error rather than a silent deny (teamId, userId) or a silent widen.
export interface AccessResolvable {
  id: number;
  usesTeam: boolean;
  teamId: number | null;
  userId: number | null;
  status: string;
  devIdps: string[] | null;
}

// The merged authority one actor holds over one integration. Personal
// ownership, team role, organization consent and app role all resolve into the
// same set and are unioned, so every rule downstream reads `permissions` and
// nothing else. `userTeamRole` and `owner` are display data and the requester
// label, not inputs to any decision.
export interface IntegrationAccess {
  userTeamRole: string | null;
  owner: boolean;
  permissions: Permission[];
}

const plain = (value: any): AccessResolvable => (value?.get ? value.get({ plain: true }) : value);

const overlaps = (a: readonly string[], b: readonly string[]) => a.some((item) => b.includes(item));

const teamsOwning = (rows: AccessResolvable[]) =>
  Array.from(new Set(rows.filter((row) => row.usesTeam && row.teamId).map((row) => row.teamId!)));

// Same population getAllowedRequest attached, so responses keep their shape.
const commonPopulation = [
  { model: models.user, required: false },
  { model: models.team, required: false },
];

/**
 * Resolve every source of authority for many integrations at once: one
 * membership query and one organization-link query however many rows are
 * passed, the app roles once, and the per-row ownership and IdP checks in
 * memory.
 *
 * A list path passes the `scope` its `where` clause was built from, so the role
 * a row was admitted on is the role it is resolved with, and the memberships
 * are read once for the request rather than once per query. A single-row caller
 * has no scope to hand over and looks up the one team it needs.
 */
export const resolveAccessForIntegrations = async (
  session: Session,
  integrations: any[],
  scope?: AccessScope,
): Promise<Map<number, IntegrationAccess>> => {
  const userId = session?.user?.id as number;
  const rows = integrations.map(plain);
  const byIntegration = new Map<number, IntegrationAccess>();
  if (rows.length === 0) return byIntegration;

  const teamIds = scope ? [] : teamsOwning(rows);
  const roleByTeam = scope ? scope.roleByTeam : await resolveTeamRoles(userId, teamIds);
  const linkByTeam: Map<number, OrganizationLink> = scope
    ? scope.organizationTeams
    : await resolveOrganizationLinks(userId, teamIds);

  const appPermissions = commonPermissionsForAppRoles(session?.client_roles);
  const approverIdps = getAllowedIdpsForApprover(session);

  for (const row of rows) {
    const teamRole = row.usesTeam && row.teamId ? roleByTeam.get(row.teamId) ?? null : null;

    // A personal integration confers full authority on its owner — the same
    // authority a team admin holds over a team-owned one. So does a draft
    // switched to team ownership before a team was picked: it has no team to
    // defer to yet, and cannot be submitted until it does.
    const owner = row.userId === userId && (!row.usesTeam || (row.teamId === null && row.status === 'draft'));

    // IdP approvers reach an integration through its IdPs rather than through
    // ownership, so their share is decided per row.
    const approverPermissions: Permission[] = overlaps(approverIdps, row.devIdps ?? []) ? ['integrations:read'] : [];

    // An organization reaches the integration through the team that owns it
    // *now*, so an override left behind by a reassignment is never found.
    const link = row.usesTeam && row.teamId ? linkByTeam.get(row.teamId) : undefined;

    byIntegration.set(row.id, {
      userTeamRole: teamRole,
      owner,
      permissions: union([
        owner ? PRESETS['team-admin'] : [],
        permissionsForTeamRole(teamRole),
        organizationPermissions(link, link?.overrides.get(row.id)),
        appPermissions,
        approverPermissions,
      ]),
    });
  }

  return byIntegration;
};

export const resolveAccessForIntegration = async (session: Session, integration: any): Promise<IntegrationAccess> =>
  (await resolveAccessForIntegrations(session, [integration])).get(plain(integration).id)!;

/**
 * Load an integration and check one permission against the actor's merged
 * authority over it, in one call. Returns the row and the resolved access
 * together, or null when the row does not exist or the permission is not
 * held — the caller decides what a miss means.
 *
 * Archived rows are admitted unless `archived` is given: restoring one needs
 * to find it, and an admin reads them from the dashboard.
 */
export const authorizeIntegration = async (
  session: Session,
  integrationId: number,
  permission: Permission,
  options: { archived?: boolean } = {},
) => {
  const where: any = { id: integrationId, apiServiceAccount: false };
  if (options.archived !== undefined) where.archived = options.archived;

  const integration = await models.request.findOne({ where, include: commonPopulation });
  if (!integration) return null;

  const access = await resolveAccessForIntegration(session, integration);
  if (!access.permissions.includes(permission)) return null;

  // The client-side guards read the role off the row, as they did when the
  // predicate selected it as a literal column.
  integration.setDataValue('userTeamRole', access.userTeamRole);
  return { integration, access };
};
