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

const socialDevIntegration: IntegrationData = {
  ...formDataDev,
  confirmSocial: true,
  devIdps: ['social', 'azureidir'],
};

const socialProdIntegration: IntegrationData = {
  ...formDataProd,
  devIdps: ['social', 'azureidir'],
};

describe('Feature flag', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  it('Does not allow social as an IDP if feature flag is not included in env vars', async () => {
    process.env.INCLUDE_SOCIAL = undefined;
    const result = await submitNewIntegration(socialDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow social as an IDP if feature flag is set but not true', async () => {
    process.env.INCLUDE_SOCIAL = 'false';
    const result = await submitNewIntegration(socialDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Allows social as an IDP if feature flag is set to true', async () => {
    process.env.INCLUDE_SOCIAL = 'true';
    const result = await submitNewIntegration(socialDevIntegration);
    expect(result.status).toBe(200);
  });
});

describe('Agrees to terms', () => {
  beforeEach(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    process.env.INCLUDE_SOCIAL = 'true';
  });

  it('Does not allow social as an IDP if user has not agreed to terms', async () => {
    let result = await submitNewIntegration({ ...socialDevIntegration, confirmSocial: false });
    expect(result.status).toBe(422);

    result = await submitNewIntegration({ ...socialDevIntegration, confirmSocial: undefined });
    expect(result.status).toBe(422);
  });

  it('Does allow social as an IDP if the user has agreed to terms', async () => {
    const result = await submitNewIntegration({ ...socialDevIntegration, confirmSocial: true });
    expect(result.status).toBe(200);
  });
});

describe('Build Github Dispatch', () => {
  it('Removes social IDPs from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(socialProdIntegration);
    expect(processedIntegration?.prodIdps?.includes('social')).toBe(false);

    // Only removes from prod
    expect(processedIntegration?.prodIdps?.includes('azureidir')).toBe(true);
    expect(processedIntegration?.testIdps?.includes('social')).toBe(true);
    expect(processedIntegration?.devIdps?.includes('social')).toBe(true);
  });

  it('Does not add the idp scopes to production if social is excluded from the production idp list', () => {
    const result = getDefaultClientScopes(
      {
        ...socialProdIntegration,
        clientId: 'myClient',
        devIdps: ['social', 'azureidir'],
        testIdps: ['social', 'azureidir'],
        prodIdps: ['azureidir'],
      },
      'prod',
    );
    // Should map to include each idps client scope
    socialIdps.forEach((idp) => {
      expect(result.includes(idp)).toBeFalsy();
    });
  });

  it('Keeps social in production IDP list if approved', () => {
    const approvedIntegration = { ...socialProdIntegration, socialApproved: true };
    const processedIntegration = buildGitHubRequestData(approvedIntegration);
    expect(processedIntegration?.prodIdps?.includes('social')).toBe(true);
  });

  it('Does add the idp scope if included in the production idp list', () => {
    const result = getDefaultClientScopes(
      {
        ...socialProdIntegration,
        clientId: 'myClient',
        devIdps: ['social', 'idir'],
        testIdps: ['social', 'idir'],
        prodIdps: ['idir', 'social'],
      },
      'prod',
    );
    socialIdps.forEach((idp) => {
      expect(result.includes(idp)).toBeTruthy();
    });
  });
});
