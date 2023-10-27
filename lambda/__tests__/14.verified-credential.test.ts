import { buildGitHubRequestData } from '@lambda-app/github';
import { Status } from 'app/interfaces/types';
import app from './helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01, getCreateIntegrationData } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';
import { IntegrationData } from '@lambda-shared/interfaces';

jest.mock('../app/src/authenticate');

jest.mock('../actions/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve(true);
    }),
  };
});

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

// Mock dispatchRequestWorkflow to ignore timeouts during unit test
jest.mock('../app/src/github', () => {
  const { dispatchRequestWorkflow } = jest.requireActual('../app/src/github');
  return {
    ...jest.requireActual('../app/src/github'),
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
  };
});

const baseIntegration = {
  projectName: 'vc',
  projectLead: true,
  serviceType: 'gold',
  usesTeam: false,
};
const mockIntegration: IntegrationData = {
  ...baseIntegration,
  idirUserid: TEAM_ADMIN_IDIR_USERID_01,
  clientId: 'a',
  clientName: 'a',
  realm: 'a',
  publicAccess: true,
  newToSso: true,
  agreeWithTerms: true,
  protocol: 'oidc',
  authType: 'browser-login',
  apiServiceAccount: false,
  environments: ['dev', 'test', 'prod'],
  prNumber: 1,
  actionNumber: 1,
  hasUnreadNotifications: true,
  browserFlowOverride: 'a',
  additionalRoleAttribute: 'a',
  teamId: null,
  userId: 1,
  team: null,
  user: null,
  devValidRedirectUris: [],
  testValidRedirectUris: [],
  prodValidRedirectUris: [],
  devIdps: ['verifiedcredential', 'idir'],
  testIdps: ['verifiedcredential', 'idir'],
  prodIdps: ['verifiedcredential', 'idir'],
  devRoles: [],
  testRoles: [],
  prodRoles: [],
  devLoginTitle: 'a',
  testLoginTitle: 'a',
  prodLoginTitle: 'a',
  devAssertionLifespan: 1,
  devAccessTokenLifespan: 1,
  devSessionIdleTimeout: 1,
  devSessionMaxLifespan: 1,
  devOfflineSessionIdleTimeout: 1,
  devOfflineSessionMaxLifespan: 1,
  testAssertionLifespan: 1,
  testAccessTokenLifespan: 1,
  testSessionIdleTimeout: 1,
  testSessionMaxLifespan: 1,
  testOfflineSessionIdleTimeout: 1,
  testOfflineSessionMaxLifespan: 1,
  prodAssertionLifespan: 1,
  prodAccessTokenLifespan: 1,
  prodSessionIdleTimeout: 1,
  prodSessionMaxLifespan: 1,
  prodOfflineSessionIdleTimeout: 1,
  prodOfflineSessionMaxLifespan: 1,
  lastChanges: [],
  idirUserDisplayName: 'a',
  requester: 'a',
  status: 'submitted' as Status,
  bceidApproved: false,
  githubApproved: false,
  verifiedCredentialApproved: false,
  archived: false,
  provisioned: false,
  provisionedAt: '2023-10-10',
  userTeamRole: 'a',
  devDisplayHeaderTitle: false,
  testDisplayHeaderTitle: false,
  prodDisplayHeaderTitle: false,
  devSamlLogoutPostBindingUri: 'http://a',
  testSamlLogoutPostBindingUri: 'http://a',
  prodSamlLogoutPostBindingUri: 'http://a',
  devSamlSignAssertions: false,
  testSamlSignAssertions: false,
  prodSamlSignAssertions: false,
};

const submitNewIntegration = async (integration: IntegrationData) => {
  const { projectName, projectLead, serviceType, usesTeam } = integration;
  const {
    body: { id },
  } = await supertest(app)
    .post(`${APP_BASE_PATH}/requests`)
    .send({
      projectName,
      projectLead,
      serviceType,
      usesTeam,
    })
    .set('Accept', 'application/json');

  return supertest(app)
    .put(`${APP_BASE_PATH}/requests?submit=true`)
    .send({ ...integration, id })
    .set('Accept', 'application/json');
};

describe('Build Github Dispatch', () => {
  it('Removes verified credential from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(mockIntegration);
    expect(processedIntegration.prodIdps.includes('verifiedcredential')).toBe(false);

    // Leaves other idp alone
    expect(processedIntegration.prodIdps.includes('idir')).toBe(true);

    // Keeps VC in dev and test
    expect(processedIntegration.testIdps.includes('verifiedcredential')).toBe(true);
    expect(processedIntegration.devIdps.includes('verifiedcredential')).toBe(true);
  });

  it('Keeps verified credential in production IDP list if approved', () => {
    const approvedIntegration = Object.assign({}, mockIntegration, { verifiedCredentialApproved: true });
    const processedIntegration = buildGitHubRequestData(approvedIntegration);
    expect(processedIntegration.prodIdps.includes('verifiedcredential')).toBe(true);
  });
});

describe('IDP notifications', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Allows and saves verified credential information correctly into database', async () => {
    const result = await submitNewIntegration(mockIntegration);
    const request = await models.request.findOne({ where: { id: result.body.id }, raw: true });

    expect(request.prodIdps.includes('verifiedcredential'));
    expect(request.devIdps.includes('verifiedcredential'));
    expect(request.testIdps.includes('verifiedcredential'));
    expect(request.verifiedCredentialApproved).toBe(false);
  });

  it('Includes VC footer in email when requesting prod integration', async () => {
    const emailList = createMockSendEmail();
    const expectedFooterText = 'Next Steps for your integration with Verified Credential:';
    await submitNewIntegration(mockIntegration);

    const emailSentWithFooter = emailList.some((email) => email.body.includes(expectedFooterText));
    expect(emailSentWithFooter).toBeTruthy();
  });

  it('Excludes VC footer if not requesting prod integration', async () => {
    const emailList = createMockSendEmail();
    const expectedFooterText = 'Next Steps for your integration with Verified Credential:';
    await submitNewIntegration({ ...mockIntegration, environments: ['dev', 'test'] });
    const emailSentWithFooter = emailList.some((email) => email.body.includes(expectedFooterText));
    expect(emailSentWithFooter).toBeFalsy();
  });
});
