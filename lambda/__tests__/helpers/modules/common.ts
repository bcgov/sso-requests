import app from '../../helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH, ACTIONS_BASE_PATH } from '../constants';
import { getCreateIntegrationData, getUpdateIntegrationData, putIntegrationBatchPr } from '../fixtures';
import { updateIntegrationPrDetails, updateIntegrationsApply } from './actions';
import { createIntegration, getIntegration, updateIntegration } from './integrations';
import { Integration } from 'app/interfaces/Request';
import { bcscPrivacyZones, bcscAttributes } from '@app/utils/constants';
import createHttpError from 'http-errors';

export const getActionsApiHeartBeat = async () => {
  return await supertest(app).get(`${ACTIONS_BASE_PATH}/heartbeat`);
};

export const getAppApiHeartBeat = async () => {
  return await supertest(app).get(`${APP_BASE_PATH}/heartbeat`);
};

const getIdentityProviderList = (
  bceid: boolean = false,
  github: boolean = false,
  digitalCredential: boolean = false,
  bcServicesCard: boolean = false,
) => {
  const idps = ['azureidir'];
  if (bceid) idps.push('bceidbasic');
  if (github) idps.push('githubbcgov');
  if (digitalCredential) idps.push('digitalcredential');
  if (bcServicesCard) idps.push('bcservicescard');
  return idps;
};

export const applyIntegration = async (args: { integrationId: number; planned?: boolean; applied?: boolean }) => {
  const { integrationId, planned = false, applied = false } = args;
  if (planned) {
    let updateIntPrDtlsRes = await updateIntegrationPrDetails({ ...putIntegrationBatchPr, id: integrationId });
    expect(updateIntPrDtlsRes.status).toEqual(200);
    expect(updateIntPrDtlsRes.body).toEqual(true);
  }

  if (applied) {
    let updateIntApplyRes = await updateIntegrationsApply({ ids: [integrationId], success: true });
    expect(updateIntApplyRes.status).toEqual(200);
    expect(updateIntApplyRes.body).toEqual(true);
  }

  return await getIntegration(integrationId);
};

export const buildIntegration = async (args: {
  projectName: string;
  bceid?: boolean;
  github?: boolean;
  digitalCredential?: boolean;
  bcServicesCard?: boolean;
  teamId?: number;
  protocol?: string;
  authType?: string;
  publicAccess?: boolean;
  prodEnv?: boolean;
  submitted?: boolean;
}) => {
  const {
    projectName,
    bceid = false,
    github = false,
    digitalCredential = false,
    bcServicesCard = false,
    teamId,
    protocol = 'oidc',
    authType = 'browser-login',
    publicAccess = true,
    prodEnv = false,
    submitted = false,
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
    identityProviders: getIdentityProviderList(bceid, github, digitalCredential, bcServicesCard),
    envs,
    protocol,
    authType,
    publicAccess,
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
