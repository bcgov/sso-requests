import axios from 'axios';
import { KC_ENTRA_IDP_REALM } from '@app/utils/constants';
import { formDataDev } from './helpers/fixtures';
import { bcgovIdirIdpMappers } from '@app/utils/constants';
import { cleanUpDatabaseTables } from './helpers/utils';
import { getEntraClientByRequestId, saveEntraClient } from '@app/queries/entra-client';
import { validateIDPs } from '@app/utils/helpers';
import { ConfidentialClientApplication } from '@azure/msal-node';

jest.mock('axios');
jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn(),
}));
jest.mock('@app/utils/graph-api', () => ({
  setupEntraIntegration: jest.fn(),
  deleteServicePrincipal: jest.fn(),
  deleteAppRegistration: jest.fn(),
  validateIdirEmail: jest.fn(),
}));
jest.mock('@app/keycloak/idp', () => ({
  createIdp: jest.fn(),
  createIdpMapper: jest.fn(),
  deleteIdp: jest.fn(),
  getIdp: jest.fn(),
  getIdpMappers: jest.fn(),
}));
jest.mock('@app/keycloak/keys', () => ({
  createPS256Key: jest.fn(),
  getActivePS256KeyCert: jest.fn(),
}));
jest.mock('@app/controllers/requests', () => ({
  createBCSCIntegration: jest.fn(),
  createEntraIntegration: jest.fn(),
  deleteBCSCIntegration: jest.fn(),
  deleteEntraIntegration: jest.fn(),
}));
jest.mock('@app/keycloak/adminClient');
jest.mock('@app/keycloak/protocolMappers', () => ({
  createAccessTokenAudMapper: jest.fn(),
  createClientRolesMapper: jest.fn(),
  createPreferredUsernameMapper: jest.fn(),
  createTeamMapper: jest.fn(),
  deleteMapper: jest.fn(),
  listClientProtocolMappers: jest.fn(() => Promise.resolve([])),
  manageAdditionalClientRolesMapper: jest.fn(),
}));
jest.mock('@app/queries/custom-requests', () => ({
  doSkipPrivacyZoneScope: jest.fn(() => Promise.resolve(true)),
}));

const requests = jest.requireActual('@app/controllers/requests') as typeof import('@app/controllers/requests');
const graphApi = jest.requireMock('@app/utils/graph-api') as jest.Mocked<typeof import('@app/utils/graph-api')>;
const idp = jest.requireMock('@app/keycloak/idp') as jest.Mocked<typeof import('@app/keycloak/idp')>;
const keys = jest.requireMock('@app/keycloak/keys') as jest.Mocked<typeof import('@app/keycloak/keys')>;
const keycloakRequests = jest.requireMock('@app/controllers/requests') as jest.Mocked<
  Pick<typeof import('@app/controllers/requests'), 'createEntraIntegration' | 'deleteEntraIntegration'>
>;
const { keycloakClient } = require('@app/keycloak/integration') as typeof import('@app/keycloak/integration');
const { getAdminClient } = require('@app/keycloak/adminClient') as jest.Mocked<
  typeof import('@app/keycloak/adminClient')
>;

const integration = {
  ...formDataDev,
  clientId: 'entra-client',
  projectName: 'Entra Project',
  devIdps: [KC_ENTRA_IDP_REALM],
};

const integrationForRequest = (id: number) => ({ ...integration, id });

const createPersistedEntraClient = (request: typeof integration) =>
  saveEntraClient({
    appName: 'entra-project-1-dev',
    appId: 'app-id',
    keyThumbprint: 'key-thumbprint',
    servicePrincipalId: 'service-principal-id',
    environment: 'dev',
    requestId: request.id!,
  });

const setupKeycloakClient = (archived = false) => {
  const kcAdminClient = {
    baseUrl: 'https://keycloak.example',
    accessToken: 'access-token',
    clients: {
      find: jest.fn(() => Promise.resolve(archived ? [{ id: 'keycloak-client-id' }] : [])),
      del: jest.fn(),
      create: jest.fn(() => Promise.resolve({ id: 'keycloak-client-id' })),
      update: jest.fn(),
      listRoles: jest.fn(() => Promise.resolve([])),
      listDefaultClientScopes: jest.fn(() => Promise.resolve([])),
      listOptionalClientScopes: jest.fn(() => Promise.resolve([])),
      addDefaultClientScope: jest.fn(),
    },
    roles: {
      findOneByName: jest.fn(() => Promise.resolve(null)),
      create: jest.fn(),
      delByName: jest.fn(),
    },
    clientScopes: { find: jest.fn(() => Promise.resolve([])) },
  };
  getAdminClient.mockResolvedValue({ kcAdminClient } as never);
  return kcAdminClient;
};

beforeAll(async () => {
  await cleanUpDatabaseTables();
});

beforeEach(() => {
  jest.clearAllMocks();
  idp.getIdp.mockResolvedValue(undefined);
  idp.getIdpMappers.mockResolvedValue([]);
  keys.getActivePS256KeyCert.mockResolvedValue({
    kid: 'kc-key-id',
    certificatePem: '-----BEGIN CERTIFICATE-----\nkc-cert\n-----END CERTIFICATE-----',
    certificateRawBase64: 'kc-cert',
  });
  graphApi.setupEntraIntegration.mockResolvedValue({
    appId: 'app-id',
    servicePrincipalId: 'service-principal-id',
    secret: { customKeyIdentifier: 'key-thumbprint' },
  });
});

// validateIDPs no longer reads the session: the caller says whether the actor
// may add a restricted IdP. bcgovidir is one of them.
describe('bcgovidir idp permissions', () => {
  it('does not allow regular users to add the bcgovidir identity provider', () => {
    const isValid = validateIDPs({
      currentIdps: ['azureidir'],
      updatedIdps: ['azureidir', KC_ENTRA_IDP_REALM],
      canAddRestrictedIdps: false,
    });

    expect(isValid).toBe(false);
  });

  it('allows an actor who may add restricted idps to add the bcgovidir identity provider', () => {
    const isValid = validateIDPs({
      currentIdps: ['azureidir'],
      updatedIdps: ['azureidir', KC_ENTRA_IDP_REALM],
      canAddRestrictedIdps: true,
    });

    expect(isValid).toBe(true);
  });
});

describe('createEntraIntegration', () => {
  it('provisions, persists, and configures a new Entra integration', async () => {
    await requests.createEntraIntegration('dev', integration);

    expect(graphApi.setupEntraIntegration).toHaveBeenCalledWith(
      'entra-project-1-dev',
      'dev',
      integration,
      expect.anything(),
    );
    await expect(getEntraClientByRequestId({ integrationId: integration.id!, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({
        appName: 'entra-project-1-dev',
        appId: 'app-id',
        keyThumbprint: 'key-thumbprint',
        servicePrincipalId: 'service-principal-id',
      }),
    ]);
    expect(idp.createIdp).toHaveBeenCalledWith(
      expect.objectContaining({
        alias: 'entra-client',
        displayName: 'Entra Project',
        realm: KC_ENTRA_IDP_REALM,
        config: expect.objectContaining({ clientId: 'app-id' }),
      }),
      'dev',
    );
    expect(idp.createIdpMapper).toHaveBeenCalledTimes(bcgovIdirIdpMappers.length);
    expect(idp.createIdpMapper).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'username', idpAlias: 'entra-client', realmName: KC_ENTRA_IDP_REALM }),
    );
  });

  it('does not reprovision existing Entra resources or duplicate IDP mappers', async () => {
    const existingIntegration = integrationForRequest(2);
    await createPersistedEntraClient(existingIntegration);
    idp.getIdp.mockResolvedValue({ alias: 'entra-client' } as never);
    idp.getIdpMappers.mockResolvedValue(bcgovIdirIdpMappers as never);

    await requests.createEntraIntegration('dev', existingIntegration);

    expect(graphApi.setupEntraIntegration).not.toHaveBeenCalled();
    await expect(
      getEntraClientByRequestId({ integrationId: existingIntegration.id!, environment: 'dev' }),
    ).resolves.toHaveLength(1);
    expect(idp.createIdp).not.toHaveBeenCalled();
    expect(idp.createIdpMapper).not.toHaveBeenCalled();
  });

  it('logs and rethrows an Entra provisioning failure', async () => {
    const failedIntegration = integrationForRequest(3);
    const error = new Error('invalid Entra response');
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    graphApi.setupEntraIntegration.mockRejectedValue(error);

    await expect(requests.createEntraIntegration('dev', failedIntegration)).rejects.toThrow(error);

    expect(consoleError).toHaveBeenCalledWith('could not create Entra integration', error);
    expect(idp.createIdp).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('deleteEntraIntegration', () => {
  it('deletes Entra resources, Keycloak IDP, and its persisted record', async () => {
    const deleteIntegration = integrationForRequest(4);
    await createPersistedEntraClient(deleteIntegration);
    idp.getIdp.mockResolvedValue({ alias: 'entra-client' } as never);

    await requests.deleteEntraIntegration('dev', deleteIntegration);

    expect(graphApi.deleteServicePrincipal).toHaveBeenCalledWith('service-principal-id');
    expect(graphApi.deleteAppRegistration).toHaveBeenCalledWith('app-id');
    expect(idp.deleteIdp).toHaveBeenCalledWith({
      environment: 'dev',
      idpAlias: 'entra-client',
      realmName: KC_ENTRA_IDP_REALM,
    });
    await expect(
      getEntraClientByRequestId({ integrationId: deleteIntegration.id!, environment: 'dev' }),
    ).resolves.toEqual([]);
  });

  it('does nothing when no Entra record exists', async () => {
    await requests.deleteEntraIntegration('dev', integrationForRequest(5));

    expect(graphApi.deleteServicePrincipal).not.toHaveBeenCalled();
    expect(graphApi.deleteAppRegistration).not.toHaveBeenCalled();
    expect(idp.deleteIdp).not.toHaveBeenCalled();
  });

  it('removes the persisted record when the Keycloak IDP is already absent', async () => {
    const missingIdpIntegration = integrationForRequest(6);
    await createPersistedEntraClient(missingIdpIntegration);

    await requests.deleteEntraIntegration('dev', missingIdpIntegration);

    expect(idp.deleteIdp).not.toHaveBeenCalled();
    await expect(
      getEntraClientByRequestId({ integrationId: missingIdpIntegration.id!, environment: 'dev' }),
    ).resolves.toEqual([]);
  });

  it('logs and rethrows invalid Entra delete responses', async () => {
    const failedDeleteIntegration = integrationForRequest(7);
    const error = new Error('invalid Entra response');
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    await createPersistedEntraClient(failedDeleteIntegration);
    graphApi.deleteServicePrincipal.mockRejectedValue(error);

    await expect(requests.deleteEntraIntegration('dev', failedDeleteIntegration)).rejects.toThrow(error);

    expect(consoleError).toHaveBeenCalledWith('could not delete Entra integration', error);
    expect(graphApi.deleteAppRegistration).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe('keycloakClient Entra orchestration', () => {
  it('creates the Entra integration before provisioning the Keycloak client', async () => {
    const kcAdminClient = setupKeycloakClient();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });

    await expect(keycloakClient('dev', integration)).resolves.toBe(true);

    expect(keycloakRequests.createEntraIntegration).toHaveBeenCalledWith('dev', integration);
    expect(kcAdminClient.clients.create).toHaveBeenCalled();
  });

  it('deletes the Entra integration before deleting an archived Keycloak client', async () => {
    const kcAdminClient = setupKeycloakClient(true);

    await expect(keycloakClient('dev', { ...integration, archived: true })).resolves.toBe(true);

    expect(keycloakRequests.deleteEntraIntegration).toHaveBeenCalledWith(
      'dev',
      expect.objectContaining({ archived: true }),
    );
    expect(kcAdminClient.clients.del).toHaveBeenCalledWith({ id: 'keycloak-client-id', realm: 'standard' });
  });
});

describe('callAzureGraphApi retries', () => {
  const actualGraphApi = jest.requireActual('@app/utils/graph-api') as typeof import('@app/utils/graph-api');

  beforeEach(() => {
    jest.useFakeTimers();
    (ConfidentialClientApplication as jest.Mock).mockImplementation(() => ({
      acquireTokenByClientCredential: jest.fn(() =>
        Promise.resolve({ accessToken: 'graph-token', expiresOn: new Date(Date.now() + 3600_000) }),
      ),
    }));
    (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('retries a transient invalid Graph response before succeeding', async () => {
    const notFound = { response: { status: 404, headers: {} } };
    (axios.request as jest.Mock).mockRejectedValueOnce(notFound).mockResolvedValueOnce({ data: { deleted: true } });

    const response = actualGraphApi.callAzureGraphApi('/v1.0/servicePrincipals/service-principal-id', {
      method: 'DELETE',
    });
    await jest.advanceTimersByTimeAsync(1500);

    await expect(response).resolves.toEqual({ deleted: true });
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it('retries a POST only when Graph confirms the request was not processed', async () => {
    const unavailable = { response: { status: 503, headers: {} } };
    (axios.request as jest.Mock).mockRejectedValueOnce(unavailable).mockResolvedValueOnce({ data: { id: 'created' } });

    const response = actualGraphApi.callAzureGraphApi('/v1.0/applications', {
      method: 'POST',
      data: { displayName: 'Entra Project' },
    });
    await jest.advanceTimersByTimeAsync(1500);

    await expect(response).resolves.toEqual({ id: 'created' });
    expect(axios.request).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['POST', 500],
    ['GET', 400],
  ])('does not retry a non-retryable %s %i response', async (method, status) => {
    const error = { response: { status, headers: {} } };
    (axios.request as jest.Mock).mockRejectedValue(error);

    await expect(
      actualGraphApi.callAzureGraphApi('/v1.0/applications', { method: method as 'GET' | 'POST' }),
    ).rejects.toBe(error);
    expect(axios.request).toHaveBeenCalledTimes(1);
  });

  it('refreshes the access token once after a 401 response', async () => {
    const unauthorized = { response: { status: 401, headers: {} } };
    (axios.request as jest.Mock).mockRejectedValueOnce(unauthorized).mockResolvedValueOnce({ data: { value: [] } });

    await expect(actualGraphApi.callAzureGraphApi('/v1.0/applications')).resolves.toEqual({ value: [] });

    expect(axios.request).toHaveBeenCalledTimes(2);
    expect(axios.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer graph-token' }) }),
    );
  });

  it('stops after the configured number of transient retries', async () => {
    const throttled = { response: { status: 429, headers: {} } };
    (axios.request as jest.Mock).mockRejectedValue(throttled);

    const response = actualGraphApi.callAzureGraphApi('/v1.0/servicePrincipals/service-principal-id', {
      method: 'DELETE',
    });
    const rejection = expect(response).rejects.toBe(throttled);
    await jest.advanceTimersByTimeAsync(60_000);

    await rejection;
    expect(axios.request).toHaveBeenCalledTimes(6);
  });
});
