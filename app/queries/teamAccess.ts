import { models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { hasTeamPermission, teamRolePermissionMap } from '@app/utils/authorize';

// What one user may do to one team. `role` is the accepted usersTeam role or
// null; `permissions` is that role's team vocabulary (add_member, delete_team…),
// which stays separate from the integration vocabulary on purpose — see
// packages/authz/README.md.
export interface TeamAccess {
  role: string | null;
  permissions: string[];
}

// The accepted memberships a user holds, one query. A pending invitation
// confers nothing. This is the leaf that integration authority composes: the
// same lookup answers "may I add a member to this team" and "what may I do to
// the integrations this team owns".
const findMemberships = async (userId: number, teamIds?: number[]): Promise<Map<number, string>> => {
  const where: any = { userId, pending: false };
  if (teamIds) where.teamId = teamIds;

  const memberships = await models.usersTeam.findAll({
    where,
    attributes: ['teamId', 'role'],
    raw: true,
  });
  return new Map(memberships.map((row: { teamId: number; role: string }) => [row.teamId, row.role]));
};

// Narrowed to teams already in hand — a single row's team, or the teams owning
// a set of rows.
export const resolveTeamRoles = async (userId: number, teamIds: number[]): Promise<Map<number, string>> =>
  teamIds.length === 0 ? new Map() : findMemberships(userId, teamIds);

// Every membership, for the access scope a list query is built from: the
// predicate is derived from what the user belongs to, before any row is read.
export const resolveAllTeamRoles = (userId: number): Promise<Map<number, string>> => findMemberships(userId);

export const resolveTeamAccess = async (userId: number, teamId: number): Promise<TeamAccess> => {
  const role = (await resolveTeamRoles(userId, [teamId])).get(teamId) ?? null;
  return { role, permissions: role ? teamRolePermissionMap[role] ?? [] : [] };
};

/**
 * Load a team and check one permission against the actor's role on it, in
 * one call. Returns the team and the resolved access together, or null when
 * the team does not exist or the permission is not held — the caller decides
 * what a miss means (usually a 403).
 */
export const authorizeTeam = async (session: Session, teamId: number, permission: string) => {
  const team = await models.team.findOne({ where: { id: teamId } });
  if (!team) return null;

  const access = await resolveTeamAccess(session?.user?.id as number, teamId);
  if (!hasTeamPermission(access.role ?? undefined, permission)) return null;
  return { team, access };
};
