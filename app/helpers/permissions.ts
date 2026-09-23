import { Permission } from '@sso/authz';
import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';
import { checkBceidGroup, checkBcServicesCard, checkGithubGroup, checkOTP, checkSocial } from './integration';
import { hasTeamPermission, teamPermissions } from '@app/utils/authorize';
import { isInFlight, isResting } from './transitions';

const isLive = (integration: Integration) =>
  Boolean(integration) && !integration.apiServiceAccount && !integration.archived;

const permits = (integration: Integration, permission: Permission): boolean | undefined =>
  integration?.permissions ? integration.permissions.includes(permission) : undefined;

export const canDeleteIntegration = (integration: Integration) => {
  if (!isLive(integration) || !isResting(integration.status)) return false;
  const permitted = permits(integration, 'integrations:delete');
  if (permitted !== undefined) return permitted;
  if (integration.usesTeam && integration.teamId) {
    return hasTeamPermission(integration.userTeamRole, teamPermissions.DELETE_REQUEST);
  }
  return true;
};

export const canEditIntegration = (integration: Integration) => {
  if (!isLive(integration) || !isResting(integration.status)) return false;
  return permits(integration, 'integrations:write') ?? true;
};

export const canManageUserRoleMappings = (integration: Integration) =>
  isLive(integration) && (permits(integration, 'user-role-mappings:write') ?? true);

export const canChangeClientSecret = (integration: Integration) =>
  isLive(integration) && (permits(integration, 'integrations:write') ?? true);

export const canDeleteTeam = (team: Team) => {
  if (!team || Number(team.integrationCount) > 0) {
    return false;
  }
  if (hasTeamPermission(team.role, teamPermissions.DELETE_TEAM)) return true;
  return false;
};

export const canEditTeam = (team: Team) => {
  if (!team) return false;
  if (hasTeamPermission(team.role, teamPermissions.UPDATE_TEAM)) return true;
  return false;
};

export const canCreateOrDeleteRoles = (integration: Integration) => {
  if (!isLive(integration) || isInFlight(integration.status)) return false;
  const permitted = permits(integration, 'roles:write');
  if (permitted !== undefined) return permitted;
  if (integration.usesTeam) {
    if (hasTeamPermission(integration.userTeamRole, teamPermissions.MANAGE_ROLES)) return true;
  } else return true;
  return false;
};

export const checkRole = (roles: string[], role: string) => roles.includes(role);

// export const assertSessionRole = (session: Session, role: string) => {
//   const hasRole = checkRole(session.client_roles, role);
//   if (!hasRole) throw new createHttpError.Forbidden(`user does not have ${role} role`);
// };

/**
 * System derivation, not authorization: an approval is void once the IdP it
 * approved is gone. Who may set or clear a flag directly is decided per field
 * by FIELD_AUTHORITY; whether the BCSC attributes may move after approval by
 * FIELD_CONSTRAINTS.
 */
export const approvalResetsForRemovedIdps = (originalData: any, updatedData: any) => {
  const changedAttrs: any = {};

  if (originalData.otpApproved && !updatedData.devIdps.some(checkOTP)) {
    changedAttrs.otpApproved = false;
  }

  if (
    (originalData.bceidApproved || originalData.devBceidApproved || originalData.testBceidApproved) &&
    !updatedData.devIdps.some(checkBceidGroup)
  ) {
    changedAttrs.bceidApproved = false;
    changedAttrs.devBceidApproved = false;
    changedAttrs.testBceidApproved = false;
  }

  if (originalData.githubApproved && !updatedData.devIdps.some(checkGithubGroup)) {
    changedAttrs.githubApproved = false;
  }

  if (originalData.bcServicesCardApproved && !updatedData.devIdps.some(checkBcServicesCard)) {
    changedAttrs.bcServicesCardApproved = false;
  }

  if (originalData.socialApproved && !updatedData.devIdps.some(checkSocial)) {
    changedAttrs.socialApproved = false;
  }

  return changedAttrs;
};
