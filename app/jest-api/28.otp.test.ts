import { createMockAuth } from './mocks/authenticate';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01, formDataDev, formDataProd } from './helpers/fixtures';
import { submitNewIntegration } from './helpers/modules/integrations';
import { IntegrationData } from '@app/shared/interfaces';
import { buildGitHubRequestData } from '@app/controllers/requests';
import { getDefaultClientScopes, socialIdps } from '@app/keycloak/integration';

const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

jest.mock('@app/keycloak/adminClient', () => {
  return {
    getAdminClient: jest.fn(() => Promise.resolve({})),
  };
});

jest.mock('@app/queries/request', () => {
  const original = jest.requireActual('@app/queries/request');
  return {
    ...original,
    getIntegrationById: jest.fn(() => Promise.resolve({ lastChanges: [] })),
  };
});

const otpDevIntegration: IntegrationData = {
  ...formDataDev,
  confirmSocial: true,
  devIdps: ['otp', 'azureidir'],
};

const otpProdIntegration: IntegrationData = {
  ...formDataProd,
  devIdps: ['otp', 'azureidir'],
};

describe('Feature flag', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  it('Does not allow otp as an IDP if feature flag is not included in env vars', async () => {
    process.env.INCLUDE_OTP = undefined;
    const result = await submitNewIntegration(otpDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow otp as an IDP if feature flag is set but not true', async () => {
    process.env.INCLUDE_OTP = 'false';
    const result = await submitNewIntegration(otpDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Allows otp as an IDP if feature flag is set to true', async () => {
    process.env.INCLUDE_OTP = 'true';
    const result = await submitNewIntegration(otpDevIntegration);
    expect(result.status).toBe(200);
  });
});

describe('Build Github Dispatch', () => {
  it('Removes otp IDP from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(otpProdIntegration);
    expect(processedIntegration?.prodIdps?.includes('otp')).toBe(false);

    // Only removes from prod
    expect(processedIntegration?.prodIdps?.includes('azureidir')).toBe(true);
    expect(processedIntegration?.testIdps?.includes('otp')).toBe(true);
    expect(processedIntegration?.devIdps?.includes('otp')).toBe(true);
  });

  it('Does not add the idp scopes to production if otp is excluded from the production idp list', () => {
    const result = getDefaultClientScopes(
      {
        ...otpProdIntegration,
        clientId: 'myClient',
        devIdps: ['otp', 'azureidir'],
        testIdps: ['otp', 'azureidir'],
        prodIdps: ['azureidir'],
      },
      'prod',
    );
    // Should map to include each idps client scope
    expect(result.includes('otp')).toBeFalsy();
  });
});
