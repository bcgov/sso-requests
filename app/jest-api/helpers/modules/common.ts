import { API_BASE_PATH } from '../constants';
import { getCreateIntegrationData, getUpdateIntegrationData, putIntegrationBatchPr } from '../fixtures';
import { createIntegration, getIntegration, updateIntegration } from './integrations';
import { Integration } from '@app/interfaces/Request';
import createHttpError from 'http-errors';
import heartBeatHandler from '@app/pages/api/heartbeat';
import { testClient } from '../test-client';
import { expect } from '@jest/globals';

export const getAppApiHeartBeat = async () => {
  return await testClient(heartBeatHandler).get(`${API_BASE_PATH}/heartbeat`);
};

const getIdentityProviderList = (
  bceid: boolean = false,
  bceidBusiness: boolean = false,
  bceidBoth: boolean = false,
  github: boolean = false,
  githubPublic: boolean = false,
  digitalCredential: boolean = false,
  bcServicesCard: boolean = false,
  social: boolean = false,
) => {
  const idps = ['azureidir'];
  if (bceid) idps.push('bceidbasic');
  if (bceidBusiness) idps.push('bceidbusiness');
  if (bceidBoth) idps.push('bceidboth');
  if (github) idps.push('githubbcgov');
  if (githubPublic) idps.push('githubpublic');
  if (digitalCredential) idps.push('digitalcredential');
  if (bcServicesCard) idps.push('bcservicescard');
  if (social) idps.push('social');
  return idps;
};

export const applyIntegration = async (args: { integrationId: number; planned?: boolean; applied?: boolean }) => {
  const { integrationId } = args;
  return await getIntegration(integrationId);
};

export const buildIntegration = async (args: {
  projectName: string;
  bceid?: boolean;
  github?: boolean;
  digitalCredential?: boolean;
  bcServicesCard?: boolean;
  social?: boolean;
  teamId?: number;
  protocol?: string;
  authType?: string;
  publicAccess?: boolean;
  prodEnv?: boolean;
  submitted?: boolean;
  bceidBusiness?: boolean;
  bceidBoth?: boolean;
  githubPublic?: boolean;
  bceidApproved?: boolean;
  githubApproved?: boolean;
  bcServicesCardApproved?: boolean;
  socialApproved?: boolean;
}) => {
  const {
    projectName,
    bceid = false,
    github = false,
    bceidBusiness = false,
    bceidBoth = false,
    githubPublic = false,
    digitalCredential = false,
    bcServicesCard = false,
    social = false,
    teamId,
    protocol = 'oidc',
    authType = 'browser-login',
    publicAccess = true,
    prodEnv = false,
    submitted = false,
    githubApproved = false,
    bceidApproved = false,
    bcServicesCardApproved = false,
    socialApproved = false,
  } = args;

  let integration: Integration;

  const envs = ['dev', 'test'];

  if (prodEnv) envs.push('prod');

  if (!projectName) throw new createHttpError.BadRequest('projectName is required');

  const createIntRes = await createIntegration(
    getCreateIntegrationData({ projectName, teamIntegration: teamId ? true : false, teamId }),
  );
  expect(createIntRes.status).toEqual(200);
  integration = createIntRes.body;

  const updateableIntegration = getUpdateIntegrationData({
    integration,
    identityProviders: getIdentityProviderList(
      bceid,
      bceidBusiness,
      bceidBoth,
      github,
      githubPublic,
      digitalCredential,
      bcServicesCard,
      social,
    ),
    envs,
    protocol,
    authType,
    publicAccess,
    bceidApproved,
    githubApproved,
    bcServicesCardApproved,
    socialApproved,
  });

  if (bcServicesCard) {
    updateableIntegration.bcscPrivacyZone = 'zone1';
    updateableIntegration.bcscAttributes = ['age', 'postal_code'];
    updateableIntegration.devHomePageUri = 'https://example.com';
    updateableIntegration.testHomePageUri = 'https://example.com';
    updateableIntegration.prodHomePageUri = 'https://example.com';
  }

  return await updateIntegration({ ...updateableIntegration }, submitted);
};
