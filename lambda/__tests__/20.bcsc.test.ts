import { cleanUpDatabaseTables, createMockSendEmail } from './helpers/utils';
import * as IdpModule from '@lambda-app/keycloak/idp';
import * as ClientScopeModule from '@lambda-app/keycloak/clientScopes';
import { createBCSCIntegration } from '@lambda-app/controllers/requests';
import { formDataProd } from './helpers/fixtures';
import { bcscClientScopeMappers, bcscIdpMappers } from '@lambda-app/utils/constants';
import { submitNewIntegration } from './helpers/modules/integrations';

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
        },
      }),
    ),
  };
});

describe.skip('BCSC', () => {
  const spies = {
    getIdp: null,
    getIdpMappers: null,
    createIdpMapper: null,
    getClientScope: null,
    getClientScopeMapper: null,
    createClientScopeMapper: null,
    createClientScope: null,
    createIdp: null,
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
    spies.createClientScope = jest.spyOn(ClientScopeModule, 'createClientScope');
    spies.createClientScope.mockImplementation(() => Promise.resolve({ id: 1, name: 'name' }));
    spies.createIdp = jest.spyOn(IdpModule, 'createIdp');
    spies.createIdp.mockImplementation(() => Promise.resolve(null));
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Only creates the idp if not found', async () => {
    spies.getIdp.mockImplementation(() => Promise.resolve(null));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createIdp).toHaveBeenCalled();

    jest.clearAllMocks();

    spies.getIdp.mockImplementation(() => Promise.resolve({}));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createIdp).not.toHaveBeenCalled();
  });

  it('Only creates the idp mappers if not found', async () => {
    // Return all requiredMappers
    spies.getIdpMappers.mockImplementation(() => Promise.resolve(bcscIdpMappers));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createIdpMapper).not.toHaveBeenCalled();

    jest.clearAllMocks();

    spies.getIdpMappers.mockImplementation(() => Promise.resolve([]));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createIdpMapper).toHaveBeenCalledTimes(bcscIdpMappers.length);
  });

  it('Only creates the client scope if not found', async () => {
    // Return all requiredMappers
    spies.getClientScope.mockImplementation(() => Promise.resolve(null));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createClientScope).toHaveBeenCalled();

    jest.clearAllMocks();

    spies.getClientScope.mockImplementation(() => Promise.resolve({ id: '1', name: 'name' }));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createClientScope).not.toHaveBeenCalled();
  });

  it('Only creates the client scope mappers if not found', async () => {
    // Return all requiredMappers
    spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(null));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createClientScopeMapper).toHaveBeenCalledTimes(bcscClientScopeMappers.length);

    jest.clearAllMocks();

    spies.getClientScopeMapper.mockImplementation(() => Promise.resolve(bcscClientScopeMappers));
    await createBCSCIntegration('dev', formDataProd, 1);
    expect(spies.createClientScopeMapper).not.toHaveBeenCalled();
  });
});

const bcscProdIntegration = {
  ...formDataProd,
  devIdps: ['bcservicescard'],
};

describe('Feature flag', () => {
  it('Does not allow digital credential as an IDP if feature flag is not included in env vars', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = undefined;
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(422);
  });

  it('Does not allow digital credential as an IDP if feature flag is set but not true', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'false';
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(422);
  });

  it('Allows digital credential as an IDP if feature flag is set to true', async () => {
    process.env.INCLUDE_BC_SERVICES_CARD = 'true';
    const result = await submitNewIntegration(bcscProdIntegration);
    expect(result.status).toBe(200);
  });
});
