import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import * as IdpModule from '@lambda-app/keycloak/idp';
import * as ClientScopeModule from '@lambda-app/keycloak/clientScopes';
import { buildGitHubRequestData, createBCSCIntegration } from '@lambda-app/controllers/requests';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01, formDataDev, formDataProd } from './helpers/fixtures';
import { bcscIdpMappers } from '@lambda-app/utils/constants';
import { submitNewIntegration } from './helpers/modules/integrations';
import { IntegrationData } from '@lambda-shared/interfaces';
import { getDefaultClientScopes } from '@lambda-app/keycloak/integration';

jest.mock('@lambda-app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() => Promise.resolve([{ privacy_zone_uri: 'zone', privacy_zone_name: 'zone' }])),
    getAttributes: jest.fn(() =>
      Promise.resolve([
        {
          name: 'age',
          scope: 'profile',
        },
        {
          name: 'postal_code',
          scope: 'address',
        },
      ]),
    ),
  };
});

jest.mock('../app/src/authenticate');

jest.mock('@lambda-app/keycloak/adminClient', () => {
  return {
    getAdminClient: jest.fn(() => Promise.resolve({})),
  };
});

jest.mock('@lambda-shared/utils/ches');
jest.mock('@lambda-app/bcsc/client', () => {
  const original = jest.requireActual('@lambda-app/bcsc/client');
  return {
    ...original,
    createBCSCClient: jest.fn(() =>
      Promise.resolve({
        data: {
          client_secret: 'secret',
          client_id: 'client_id',
          registration_access_token: 'token',
        },
      }),
    ),
    updateBCSCClient: jest.fn(() =>
      Promise.resolve({
        data: {
          client_secret: 'secret',
          client_id: 'client_id',
          registration_access_token: 'token',
        },
      }),
    ),
  };
});

const OLD_ENV = process.env;
beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

['oidc', 'saml'].forEach((protocol) => {
  describe(`BCSC - ${protocol}`, () => {
    const spies = {
      getIdp: null,
      getIdpMappers: null,
      createIdpMapper: null,
      getClientScope: null,
      getClientScopeMapper: null,
      createClientScopeMapper: null,
      updateClientScopeMapper: null,
      createClientScope: null,
      createIdp: null,
      updateIdp: null,
    };

    beforeEach(() => {
      spies.getIdp = jest.spyOn(IdpModule, 'getIdp');
      spies.getIdp.mockImplementation(() => Promise.resolve(null));

      spies.getIdpMappers = jest.spyOn(IdpModule, 'getIdpMappers');
      spies.getIdpMappers.mockImplementation(() => Promise.resolve([]));
      spies.createIdpMapper = jest.spyOn(IdpModule, 'createIdpMapper');
      spies.createIdpMapper.mockImplementation(() => Promise.resolve(null));
      spies.getClientScope = jest.spyOn(ClientScopeModule, 'getClientScope');
      spies.getClientScope.mockImplementation(() => Promise.resolve({ id: '1' }));
      spies.getClientScopeMapper = jest.spyOn(ClientScopeModule, 'getClientScopeMapper');
      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));
      spies.createClientScopeMapper = jest.spyOn(ClientScopeModule, 'createClientScopeMapper');
      spies.createClientScopeMapper.mockImplementation(() => Promise.resolve(null));
      spies.updateClientScopeMapper = jest.spyOn(ClientScopeModule, 'updateClientScopeMapper');
      spies.updateClientScopeMapper.mockImplementation(() => Promise.resolve(null));
      spies.createClientScope = jest.spyOn(ClientScopeModule, 'createClientScope');
      spies.createClientScope.mockImplementation(() => Promise.resolve({ id: 1, name: 'name' }));
      spies.createIdp = jest.spyOn(IdpModule, 'createIdp');
      spies.createIdp.mockImplementation(() => Promise.resolve(null));
      spies.updateIdp = jest.spyOn(IdpModule, 'updateIdp');
      spies.updateIdp.mockImplementation(() => Promise.resolve(null));
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('Only creates the idp if not found', async () => {
      spies.getIdp.mockImplementation(() => Promise.resolve(null));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createIdp).toHaveBeenCalled();

      jest.clearAllMocks();

      spies.getIdp.mockImplementation(() => Promise.resolve({ config: { defaultScope: 'openid profile address' } }));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createIdp).not.toHaveBeenCalled();
      expect(spies.updateIdp).toHaveBeenCalled();
    });

    it('Only creates the idp mappers if not found', async () => {
      // Return all requiredMappers
      spies.getIdpMappers.mockImplementation(() => Promise.resolve(bcscIdpMappers));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createIdpMapper).not.toHaveBeenCalled();

      jest.clearAllMocks();

      spies.getIdpMappers.mockImplementation(() => Promise.resolve([]));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createIdpMapper).toHaveBeenCalledTimes(bcscIdpMappers.length);
    });

    it('Only creates the client scope if not found', async () => {
      // Return all requiredMappers
      spies.getClientScope.mockImplementation(() => Promise.resolve(null));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScope).toHaveBeenCalled();

      jest.clearAllMocks();

      spies.getClientScope.mockImplementation(() => Promise.resolve({ id: '1', name: 'name' }));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScope).not.toHaveBeenCalled();
    });

    it('Only creates the client scope mappers if not found', async () => {
      // Return all requiredMappers
      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScopeMapper).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(bcscProdIntegration.bcscAttributes));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScopeMapper).not.toHaveBeenCalled();
    });

    it('Only updates the client scope mappers if found', async () => {
      // Return all requiredMappers
      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScopeMapper).toHaveBeenCalledTimes(1);

      jest.clearAllMocks();

      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(bcscProdIntegration.bcscAttributes));
      await createBCSCIntegration('dev', { ...bcscProdIntegration, protocol }, 1);
      expect(spies.createClientScopeMapper).not.toHaveBeenCalled();
      expect(spies.updateClientScopeMapper).toHaveBeenCalled();
    });

    it('Adds in the address claim to the userinfo mapper when requesting any claim with an address scope', async () => {
      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));

      // Only including postal code. See mock above which includes address scope on this claim.
      await createBCSCIntegration('dev', { ...bcscProdIntegration, bcscAttributes: ['postal_code'] }, 1);
      expect(spies.createClientScopeMapper).toHaveBeenCalledTimes(1);

      // Get the arguments supplied to createClientScopeMapper
      const mapperArgs = spies.createClientScopeMapper.mock.calls[0][0];
      expect(mapperArgs.protocolMapperConfig.userAttributes.includes('address')).toBe(true);
    });

    it('Does not add in the address claim to the userinfo mapper when no claim requires the address scope', async () => {
      spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));

      // Only including postal code. See mock above which includes address scope on this claim.
      await createBCSCIntegration('dev', { ...bcscProdIntegration, bcscAttributes: ['age'], protocol }, 1);
      expect(spies.createClientScopeMapper).toHaveBeenCalledTimes(1);

      // Get the arguments supplied to createClientScopeMapper
      const mapperArgs = spies.createClientScopeMapper.mock.calls[0][0];
      expect(mapperArgs.protocolMapperConfig.userAttributes.includes('address')).toBe(false);
    });
  });
});

const bcscProdIntegration: IntegrationData = {
  ...formDataProd,
  devIdps: ['bcservicescard', 'idir'],
  bcscPrivacyZone: 'zone',
  bcscAttributes: ['age'],
  primaryEndUsers: [],
  devHomePageUri: 'https://example.com',
  testHomePageUri: 'https://example.com',
  prodHomePageUri: 'https://example.com',
};

const bcscDevIntegration: IntegrationData = {
  ...formDataDev,
  devIdps: ['bcservicescard', 'idir'],
  bcscPrivacyZone: 'zone',
  bcscAttributes: ['age'],
  primaryEndUsers: [],
  devHomePageUri: 'https://example.com',
  testHomePageUri: 'https://example.com',
};

describe('Feature flag', () => {
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  it('Does not allow bc services card as an IDP if feature flag is not included in env vars', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = undefined;
    const result = await submitNewIntegration(bcscDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow bc services card as an IDP if feature flag is set but not true', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'false';
    const result = await submitNewIntegration(bcscDevIntegration);
    expect(result.status).toBe(422);
  });

  it('Allows bc services card as an IDP if feature flag is set to true', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'true';
    const result = await submitNewIntegration(bcscDevIntegration);
    expect(result.status).toBe(200);
  });

  it('Does not allow BCSC to be added to production if feature flag is false', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'true';
    process.env.ALLOW_BC_SERVICES_CARD_PROD = 'false';
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow BCSC to be added to production if the feature flag is missing', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'true';
    process.env.ALLOW_BC_SERVICES_CARD_PROD = undefined;
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(422);
  });

  it('Does allow BCSC to be added to production if the feature flag is true', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'true';
    process.env.ALLOW_BC_SERVICES_CARD_PROD = 'true';
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(200);
  });
});

describe('Build Github Dispatch', () => {
  it('Removes bc services card from production IDP list if not approved yet, but keeps it in dev and test', () => {
    const processedIntegration = buildGitHubRequestData(bcscProdIntegration);
    expect(processedIntegration.prodIdps.includes('bcservicescard')).toBe(false);

    // Leaves other idp alone
    expect(processedIntegration.prodIdps.includes('idir')).toBe(true);

    // Keeps BCSC in dev and test
    expect(processedIntegration.testIdps.includes('bcservicescard')).toBe(true);
    expect(processedIntegration.devIdps.includes('bcservicescard')).toBe(true);
  });

  it('Does not add the idp scope if not in the production idp list', () => {
    const result = getDefaultClientScopes(
      {
        ...bcscProdIntegration,
        clientId: 'myClient',
        devIdps: ['bcservicescard', 'idir'],
        testIdps: ['bcservicescard', 'idir'],
        prodIdps: ['idir'],
      },
      'prod',
    );
    expect(result.includes('myClient')).toBeFalsy();
  });

  it('Keeps bc services card in production IDP list if approved', () => {
    const approvedIntegration = { ...bcscProdIntegration, bcServicesCardApproved: true };
    const processedIntegration = buildGitHubRequestData(approvedIntegration);
    expect(processedIntegration.prodIdps.includes('bcservicescard')).toBe(true);
  });

  it('Does add the idp scope if included in the production idp list', () => {
    const result = getDefaultClientScopes(
      {
        ...bcscProdIntegration,
        clientId: 'myClient',
        devIdps: ['bcservicescard', 'idir'],
        testIdps: ['bcservicescard', 'idir'],
        prodIdps: ['idir', 'bcservicescard'],
      },
      'prod',
    );
    expect(result.includes('myClient')).toBeTruthy();
  });
});
