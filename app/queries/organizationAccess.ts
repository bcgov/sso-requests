import { OrganizationLink, Permission } from '@sso/authz';
import { Session } from '@app/shared/interfaces';
import { appPermissions, hasAppPermission, organizationRolePermissionMap } from '@app/utils/authorize';
import {
  findActiveLinks,
  getOrganizationById,
  getOrganizationMember,
  getOverridesByLink,
} from '@app/queries/organization';

export interface OrganizationAccess {
  role: string | null;
  permissions: string[];
}

const isCssAdmin = (session: Session) => hasAppPermission(session?.client_roles, appPermissions.MANAGE_ORGANIZATIONS);

export const resolveOrganizationAccess = async (
  session: Session,
  organizationId: number,
): Promise<OrganizationAccess> => {
  const member = await getOrganizationMember(organizationId, session?.user?.id as number);
  const role = member?.role ?? null;
  if (isCssAdmin(session)) return { role, permissions: organizationRolePermissionMap.admin };
  return { role, permissions: role ? organizationRolePermissionMap[role] ?? [] : [] };
};

export const authorizeOrganization = async (session: Session, organizationId: number, permission: string) => {
  const organization = await getOrganizationById(organizationId);
  if (!organization) return null;

  const access = await resolveOrganizationAccess(session, organizationId);
  if (!access.permissions.includes(permission)) return null;
  return { organization, access };
};

export const resolveOrganizationLinks = async (
  userId: number,
  teamIds?: number[],
): Promise<Map<number, OrganizationLink>> => {
  const links = await findActiveLinks(userId, teamIds);
  const byTeam = new Map<number, OrganizationLink>();
  if (links.length === 0) return byTeam;

  const overridesByLink = await getOverridesByLink(links.map((link: any) => link.id));

  (links as any[]).forEach((link) => {
    byTeam.set(link.teamId, {
      permissions: (link.permissions ?? []) as Permission[],
      overrides: new Map(
        (overridesByLink.get(link.id) ?? []).map((override: any) => [
          override.requestId,
          (override.permissions ?? []) as Permission[],
        ]),
      ),
    });
  });

  return byTeam;
};
