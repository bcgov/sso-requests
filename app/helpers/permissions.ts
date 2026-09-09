import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';
import { Session } from '@app/shared/interfaces';
import createHttpError from 'http-errors';
import { checkBceidGroup, checkBcServicesCard, checkGithubGroup, checkOTP, checkSocial } from './integration';
import { isEqual } from 'lodash';
import { hasAppPermission, hasTeamPermission, teamPermissions, appPermissions } from '@app/utils/authorize';
import { Level, LEVEL_RANK } from '@app/shared/enums';

const isNativeIntegrationAccess = (integration: Integration) => !integration.usesTeam || !!integration.userTeamRole;

export const getOrganizationLevel = (integration: Integration, environment?: string): Level => {
  const access = integration.organizationAccess;
  if (!access) return 'none';
  if (environment) return access.environmentLevels?.[environment] ?? access.defaultLevel;
  return access.effectiveLevel;
};

export const hasOrganizationLevel = (
  integration: Integration,
  required: Level,
  environment?: string,
  everyEnvironment = false,
) => {
  if (!integration.organizationAccess) return false;
  if (everyEnvironment) {
    const environments = integration.environments?.length ? integration.environments : [undefined];
    return environments.every((env) => LEVEL_RANK[getOrganizationLevel(integration, env)] >= LEVEL_RANK[required]);
  }
  return LEVEL_RANK[getOrganizationLevel(integration, environment)] >= LEVEL_RANK[required];
};

export const getAccessibleEnvironments = (integration: Integration, required: Level = 'viewer') => {
  const environments = integration.environments ?? [];
  if (isNativeIntegrationAccess(integration)) return environments;
  return environments.filter(
    (environment) => LEVEL_RANK[getOrganizationLevel(integration, environment)] >= LEVEL_RANK[required],
  );
};

/**
 * For an integration the user has access to, determine delete permissions.
 */
export const canDeleteIntegration = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    ['planFailed', 'planned', 'applyFailed', 'submitted'].includes(integration?.status || '')
  ) {
    return false;
  }

  if (integration.usesTeam && integration.teamId) {
    if (hasTeamPermission(integration.userTeamRole, teamPermissions.DELETE_REQUEST)) return true;
  } else if (isNativeIntegrationAccess(integration)) return true;

  if (hasOrganizationLevel(integration, 'editor', undefined, true)) return true;

  return false;
};

export const canEditIntegration = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    !['draft', 'applied'].includes(integration.status || '')
  ) {
    return false;
  }

  if (isNativeIntegrationAccess(integration)) return true;
  if (hasOrganizationLevel(integration, 'editor', undefined, true)) return true;
  return false;
};

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

export const canCreateOrDeleteRoles = (integration: Integration, environment?: string) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    ['pr', 'planned', 'submitted'].includes(integration?.status || '')
  ) {
    return false;
  }
  if (integration.usesTeam) {
    if (hasTeamPermission(integration.userTeamRole, teamPermissions.MANAGE_ROLES)) return true;
  } else if (isNativeIntegrationAccess(integration)) return true;

  if (hasOrganizationLevel(integration, 'role-manager', environment)) return true;
  return false;
};

export const canManageRoleAssignments = (integration: Integration, environment?: string) => {
  if (isNativeIntegrationAccess(integration)) return true;
  return hasOrganizationLevel(integration, 'role-manager', environment);
};

export const canRotateSecret = (integration: Integration, environment?: string) => {
  if (isNativeIntegrationAccess(integration)) return true;
  return hasOrganizationLevel(integration, 'editor', environment);
};

export const checkRole = (roles: string[], role: string) => roles.includes(role);

// export const assertSessionRole = (session: Session, role: string) => {
//   const hasRole = checkRole(session.client_roles, role);
//   if (!hasRole) throw new createHttpError.Forbidden(`user does not have ${role} role`);
// };

/**
 * Throws forbidden error if not an allowed approver, or updating bcsc attributes post approval. Resets approval if previously approved idp is remove.
 */
export const getIdpApprovalStatus = ({ session, originalData, updatedData }: any) => {
  const changedAttrs: any = {};

  const isApprovingBceid = !originalData.bceidApproved && updatedData.bceidApproved;
  if (isApprovingBceid && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_BCEID))
    throw new createHttpError.Forbidden('not allowed to approve bceid');

  const isApprovingDevBceid = !originalData.devBceidApproved && updatedData.devBceidApproved;
  if (isApprovingDevBceid && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_BCEID))
    throw new createHttpError.Forbidden('not allowed to approve bceid');

  const isApprovingTestBceid = !originalData.testBceidApproved && updatedData.testBceidApproved;
  if (isApprovingTestBceid && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_BCEID))
    throw new createHttpError.Forbidden('not allowed to approve bceid');

  const isApprovingGithub = !originalData.githubApproved && updatedData.githubApproved;
  if (isApprovingGithub && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_GITHUB))
    throw new createHttpError.Forbidden('not allowed to approve github');

  const isApprovingBCSC = !originalData.bcServicesCardApproved && updatedData.bcServicesCardApproved;
  if (isApprovingBCSC && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_BC_SERVICES_CARD))
    throw new createHttpError.Forbidden('not allowed to approve bc services card');

  const isApprovingSocial = !originalData.socialApproved && updatedData.socialApproved;
  if (isApprovingSocial && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_SOCIAL))
    throw new createHttpError.Forbidden('not allowed to approve social');

  const isApprovingOTP = !originalData.otpApproved && updatedData.otpApproved;
  if (isApprovingOTP && !hasAppPermission(session?.client_roles, appPermissions.APPROVE_OTP))
    throw new createHttpError.Forbidden('not allowed to approve otp');

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

  if (originalData.bcServicesCardApproved) {
    if (
      !isEqual(updatedData.bcscAttributes, originalData.bcscAttributes) ||
      !isEqual(updatedData.bcscPrivacyZone, originalData.bcscPrivacyZone)
    ) {
      throw new Error('Forbidden');
    }
  }

  return changedAttrs;
};
