import { Session } from '@lambda-shared/interfaces';
import { checkBceidGroup, checkBcServicesCard, checkGithubGroup, checkSocial } from '@app/helpers/integration';
import createHttpError from 'http-errors';
import { isEqual } from 'lodash';

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
}) => {
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
      !isEqual(updatedData.bcscAttributes, originalData.bcscAttributes) ||
      !isEqual(updatedData.bcscPrivacyZone, originalData.bcscPrivacyZone)
    ) {
      throw new Error('Forbidden');
    }
  }

  return changedAttrs;
};
