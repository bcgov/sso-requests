import { Integration } from '@app/interfaces/Request';
import { Team } from '@app/interfaces/team';
import { Session } from '@app/shared/interfaces';
import createHttpError from 'http-errors';
import { checkBceidGroup, checkBcServicesCard, checkGithubGroup, checkOTP, checkSocial } from './integration';
import isequal from 'lodash.isequal';

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
    if (integration.userTeamRole === 'admin') return true;
  } else return true;

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
  } else return true;
};

export const canDeleteTeam = (team: Team) => {
  if (!team || Number(team.integrationCount) > 0) {
    return false;
  }
  if (team.role === 'admin') return true;
  return false;
};

export const canEditTeam = (team: Team) => {
  if (!team) return false;
  if (team.role === 'admin') return true;
  return false;
};

export const canCreateOrDeleteRoles = (integration: Integration) => {
  if (
    !integration ||
    integration.apiServiceAccount ||
    integration.archived ||
    ['pr', 'planned', 'submitted'].includes(integration?.status || '')
  ) {
    return false;
  }
  if (integration.usesTeam) {
    if (integration.userTeamRole === 'admin') return true;
  } else return true;
  return false;
};

export const checkRole = (roles: string[], role: string) => roles.includes(role);
export const assertSessionRole = (session: Session, role: string) => {
  const hasRole = checkRole(session.client_roles, role);
  if (!hasRole) throw new createHttpError.Forbidden(`user does not have ${role} role`);
};

/**
 * Throws forbidden error if not an allowed approver, or updating bcsc attributes post approval. Resets approval if previously approved idp is remove.
 */
export const getIdpApprovalStatus = ({
  isAdmin,
  originalData,
  updatedData,
  bceidApprover,
  githubApprover,
  bcscApprover,
  socialApprover,
  otpApprover,
}: any) => {
  const changedAttrs: any = {};

  const isApprovingBceid = !originalData.bceidApproved && updatedData.bceidApproved;
  if (isApprovingBceid && !isAdmin && !bceidApprover)
    throw new createHttpError.Forbidden('not allowed to approve bceid');

  const isApprovingGithub = !originalData.githubApproved && updatedData.githubApproved;
  if (isApprovingGithub && !isAdmin && !githubApprover)
    throw new createHttpError.Forbidden('not allowed to approve github');

  const isApprovingBCSC = !originalData.bcServicesCardApproved && updatedData.bcServicesCardApproved;
  if (isApprovingBCSC && !isAdmin && !bcscApprover)
    throw new createHttpError.Forbidden('not allowed to approve bc services card');

  const isApprovingSocial = !originalData.socialApproved && updatedData.socialApproved;
  if (isApprovingSocial && !isAdmin && !socialApprover)
    throw new createHttpError.Forbidden('not allowed to approve social');

  const isApprovingOTP = !originalData.otpApproved && updatedData.otpApproved;
  if (isApprovingOTP && !isAdmin && !otpApprover) throw new createHttpError.Forbidden('not allowed to approve otp');

  if (originalData.otpApproved && !updatedData.devIdps.some(checkOTP)) {
    changedAttrs.otpApproved = false;
  }

  if (originalData.bceidApproved && !updatedData.devIdps.some(checkBceidGroup)) {
    changedAttrs.bceidApproved = false;
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
      !isequal(updatedData.bcscAttributes, originalData.bcscAttributes) ||
      !isequal(updatedData.bcscPrivacyZone, originalData.bcscPrivacyZone)
    ) {
      throw new Error('Forbidden');
    }
  }

  return changedAttrs;
};
