import { buildGitHubRequestData } from '@lambda-app/controllers/requests';
import { Status } from 'app/interfaces/types';
import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';
import { IntegrationData } from '@lambda-shared/interfaces';
import { DIT_EMAIL_ADDRESS } from '@lambda-shared/local';
import { submitNewIntegration, updateIntegration } from './helpers/modules/integrations';
import { EMAILS } from '@lambda-shared/enums';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
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
  devIdps: ['digitalcredential', 'idir'],
  testIdps: ['digitalcredential', 'idir'],
  prodIdps: ['digitalcredential', 'idir'],
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
  devOfflineAccessEnabled: true,
  testOfflineAccessEnabled: true,
  prodOfflineAccessEnabled: true,
  lastChanges: [],
  idirUserDisplayName: 'a',
  requester: 'a',
  status: 'submitted' as Status,
  bceidApproved: false,
  githubApproved: false,
  digitalCredentialApproved: false,
  archived: false,
  provisioned: false,
  provisionedAt: '2023-10-10',
  userTeamRole: 'a',
  devDisplayHeaderTitle: false,
  testDisplayHeaderTitle: false,
  prodDisplayHeaderTitle: false,
  devSamlLogoutPostBindingUri: 'https://a',
  testSamlLogoutPostBindingUri: 'https://a',
  prodSamlLogoutPostBindingUri: 'https://a',
  devSamlSignAssertions: false,
  testSamlSignAssertions: false,
  prodSamlSignAssertions: false,
  primaryEndUsers: [],
};

const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('Build Github Dispatch', () => {
  it('Removes digital credential from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(mockIntegration);
    expect(processedIntegration.prodIdps.includes('digitalcredential')).toBe(false);

    // Leaves other idp alone
    expect(processedIntegration.prodIdps.includes('idir')).toBe(true);

    // Keeps VC in dev and test
    expect(processedIntegration.testIdps.includes('digitalcredential')).toBe(true);
    expect(processedIntegration.devIdps.includes('digitalcredential')).toBe(true);
  });

  it('Keeps digital credential in production IDP list if approved', () => {
    const approvedIntegration = { ...mockIntegration, digitalCredentialApproved: true };
    const processedIntegration = buildGitHubRequestData(approvedIntegration);
    expect(processedIntegration.prodIdps.includes('digitalcredential')).toBe(true);
  });
});

describe('Digital Credential Validations', () => {
  beforeEach(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    process.env.INCLUDE_DIGITAL_CREDENTIAL = 'true';
  });

  it('Only allows Digital Credential as an IDP for OIDC integrations', async () => {
    const samlResult = await submitNewIntegration({ ...mockIntegration, protocol: 'saml' });
    expect(samlResult.status).toBe(422);

    const oidcResult = await submitNewIntegration({ ...mockIntegration, protocol: 'oidc' });
    console.log(oidcResult.body);
    expect(oidcResult.status).toBe(200);
  });
});

describe('Digital Credential Feature flag', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  it('Does not allow digital credential as an IDP if feature flag is not included in env vars', async () => {
    process.env.INCLUDE_DIGITAL_CREDENTIAL = undefined;
    const result = await submitNewIntegration(mockIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow digital credential as an IDP if feature flag is set but not true', async () => {
    process.env.INCLUDE_DIGITAL_CREDENTIAL = 'false';
    const result = await submitNewIntegration(mockIntegration);
    expect(result.status).toBe(422);
  });

  it('Allows digital credential as an IDP if feature flag is set to true', async () => {
    process.env.INCLUDE_DIGITAL_CREDENTIAL = 'true';
    const result = await submitNewIntegration(mockIntegration);
    expect(result.status).toBe(200);
  });
});

describe('IDP notifications', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  beforeEach(() => {
    process.env.INCLUDE_DIGITAL_CREDENTIAL = 'true';
  });

  it('Allows and saves digital credential information correctly into database', async () => {
    const result = await submitNewIntegration(mockIntegration);
    const request = await models.request.findOne({ where: { id: result.body.id }, raw: true });

    expect(request.prodIdps.includes('digitalcredential'));
    expect(request.devIdps.includes('digitalcredential'));
    expect(request.testIdps.includes('digitalcredential'));
    expect(request.digitalCredentialApproved).toBe(false);
  });

  it('CCs DIT when requesting prod integration with Digital Credential as an IDP', async () => {
    const emailList = createMockSendEmail();
    await submitNewIntegration(mockIntegration);

    const submissionEmails = emailList.filter((email) => email.code === EMAILS.CREATE_INTEGRATION_SUBMITTED);
    const appliedEmails = emailList.filter((email) => email.code === EMAILS.CREATE_INTEGRATION_APPLIED);

    expect(submissionEmails.length).toBe(1);
    const submissionCCList = emailList[0].cc;
    expect(submissionCCList.includes(DIT_EMAIL_ADDRESS)).toBe(true);

    expect(appliedEmails.length).toBe(1);
    const appliedCCList = emailList[0].cc;
    expect(appliedCCList.includes(DIT_EMAIL_ADDRESS)).toBe(true);
  });

  it('Does not CC DIT when prod is unselected', async () => {
    const emailList = createMockSendEmail();
    await submitNewIntegration({ ...mockIntegration, environments: ['dev', 'test'] });

    const submissionEmails = emailList.filter((email) => email.code === EMAILS.CREATE_INTEGRATION_SUBMITTED);
    const appliedEmails = emailList.filter((email) => email.code === EMAILS.CREATE_INTEGRATION_APPLIED);

    expect(submissionEmails.length).toBe(1);
    const ccList = emailList[0].cc;

    expect(ccList.includes(DIT_EMAIL_ADDRESS)).toBe(false);

    expect(appliedEmails.length).toBe(1);
    const appliedCCList = emailList[0].cc;
    expect(appliedCCList.includes(DIT_EMAIL_ADDRESS)).toBe(false);
  });

  it('CCs DIT only when updates add prod to a DC client', async () => {
    const emailList = createMockSendEmail();
    const result = await submitNewIntegration({ ...mockIntegration, environments: ['dev', 'test'] });
    await updateIntegration({ ...mockIntegration, id: result.body.id, environments: ['dev', 'test', 'prod'] }, true);

    let updateEmails = emailList.filter((email) => email.code === EMAILS.UPDATE_INTEGRATION_SUBMITTED);
    let appliedEmails = emailList.filter((email) => email.code === EMAILS.UPDATE_INTEGRATION_APPLIED);

    expect(updateEmails.length).toBe(1);
    expect(appliedEmails.length).toBe(1);

    let ccList = updateEmails[0].cc;
    expect(ccList.includes(DIT_EMAIL_ADDRESS)).toBe(true);

    ccList = appliedEmails[0].cc;
    expect(ccList.includes(DIT_EMAIL_ADDRESS)).toBe(true);

    // Clear emails and update again. Should not CC DIT since already in production
    emailList.length = 0;
    await updateIntegration({ ...mockIntegration, id: result.body.id, publicAccess: false }, true);

    updateEmails = emailList.filter((email) => email.code === EMAILS.UPDATE_INTEGRATION_SUBMITTED);
    appliedEmails = emailList.filter((email) => email.code === EMAILS.UPDATE_INTEGRATION_APPLIED);

    expect(updateEmails.length).toBe(1);
    expect(appliedEmails.length).toBe(1);

    ccList = updateEmails[0].cc;
    expect(ccList.includes(DIT_EMAIL_ADDRESS)).toBe(false);

    ccList = appliedEmails[0].cc;
    expect(ccList.includes(DIT_EMAIL_ADDRESS)).toBe(false);
  });

  it('Includes VC footer in email when requesting prod integration', async () => {
    const emailList = createMockSendEmail();
    const expectedFooterText = 'Next Steps for your integration with Digital Credential:';
    await submitNewIntegration(mockIntegration);
    const emailSentWithFooter = emailList.some((email) => email.body.includes(expectedFooterText));
    expect(emailSentWithFooter).toBeTruthy();
  });

  it('Excludes VC footer if not requesting prod integration', async () => {
    const emailList = createMockSendEmail();
    const expectedFooterText = 'Next Steps for your integration with Digital Credential:';
    await submitNewIntegration({ ...mockIntegration, environments: ['dev', 'test'] });
    const emailSentWithFooter = emailList.some((email) => email.body.includes(expectedFooterText));
    expect(emailSentWithFooter).toBeFalsy();
  });
});
