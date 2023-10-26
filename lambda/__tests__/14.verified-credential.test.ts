import { buildGitHubRequestData } from '@lambda-app/github';
import { Status } from 'app/interfaces/types';
import app from './helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01, getCreateIntegrationData } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';

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

const baseIntegration = {
  projectName: 'vc',
  projectLead: true,
  serviceType: 'gold',
  usesTeam: false,
};
const integration = {
  // id: 1,
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

describe.skip('Build Github Dispatch', () => {
  it('Removes verified credential from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(integration);
    expect(processedIntegration.prodIdps.includes('verifiedcredential')).toBe(false);

    // Leaves other idp alone
    expect(processedIntegration.prodIdps.includes('idir')).toBe(true);

    // Keeps VC in dev and test
    expect(processedIntegration.testIdps.includes('verifiedcredential')).toBe(true);
    expect(processedIntegration.devIdps.includes('verifiedcredential')).toBe(true);
  });

  it('Keeps verified credential in production IDP list if approved', () => {
    const approvedIntegration = Object.assign({}, integration, { verifiedCredentialApproved: true });
    const processedIntegration = buildGitHubRequestData(approvedIntegration);
    expect(processedIntegration.prodIdps.includes('verifiedcredential')).toBe(true);
  });
});

describe('IDP notifications', () => {
  beforeAll(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Allows and saves verified credential IDP', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const {
      body: { id },
    } = await supertest(app).post(`${APP_BASE_PATH}/requests`).send(baseIntegration).set('Accept', 'application/json');

    console.log(id);

    const emailList = createMockSendEmail();
    const result = await supertest(app)
      .put(`${APP_BASE_PATH}/requests?submit=true`)
      .send({ ...integration, id })
      .set('Accept', 'application/json');

    console.log(emailList);
  });
});
