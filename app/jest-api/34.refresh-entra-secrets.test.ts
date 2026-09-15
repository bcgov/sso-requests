import refreshApplicationSecretsHandler from '@app/pages/api/ms-graph/refreshApplicationSecrets';
import { cleanUpDatabaseTables } from './helpers/utils';
import { testClient } from './helpers/test-client';
import { generateRequest } from './helpers/modules/integrations';
import { formDataDev } from './helpers/fixtures';
import { getEntraClientByRequestId, saveEntraClient } from '@app/queries/entra-client';
import { Status } from '@app/shared/interfaces';
import { KC_ENTRA_IDP_REALM } from '@app/utils/constants';

jest.mock('@app/utils/graph-api', () => ({
  deleteExpiredEntraClientSecret: jest.fn(),
  getAppRegistration: jest.fn(),
  refreshAppRegistrationSecret: jest.fn(),
}));
jest.mock('@app/keycloak/idp', () => ({
  getIdp: jest.fn(),
  updateIdp: jest.fn(),
}));

const graphApi = jest.requireMock('@app/utils/graph-api') as jest.Mocked<typeof import('@app/utils/graph-api')>;
const idp = jest.requireMock('@app/keycloak/idp') as jest.Mocked<typeof import('@app/keycloak/idp')>;

const createRequestWithEntraClient = async (args: { id: number; status?: Status; expiresInDays?: number }) => {
  const request = await generateRequest({
    ...formDataDev,
    id: args.id,
    clientId: `entra-client-${args.id}`,
    projectName: `Entra Project ${args.id}`,
    status: args.status ?? 'applied',
  });
  await saveEntraClient({
    appName: `entra-project-${args.id}-dev`,
    appId: `app-id-${args.id}`,
    secret: `old-secret-${args.id}`,
    servicePrincipalId: `service-principal-id-${args.id}`,
    secretExpiryDate: new Date(Date.now() + (args.expiresInDays ?? 1) * 24 * 60 * 60 * 1000),
    environment: 'dev',
    requestId: request.id,
  });
  return request;
};

beforeAll(async () => {
  await cleanUpDatabaseTables();
});

beforeEach(() => {
  jest.clearAllMocks();
  graphApi.getAppRegistration.mockResolvedValue({
    appId: 'app-id-1',
    passwordCredentials: [{ keyId: 'expired-key-id', endDateTime: new Date().toISOString() }],
  } as never);
  graphApi.refreshAppRegistrationSecret.mockResolvedValue({
    secretText: 'refreshed-secret',
    endDateTime: '2029-01-01T00:00:00.000Z',
  } as never);
  idp.getIdp.mockResolvedValue({ alias: 'entra-client-1', config: { clientSecret: 'old-secret-1' } } as never);
});

describe('refreshApplicationSecrets', () => {
  it('rejects requests without the API authorization secret', async () => {
    const response = await testClient(refreshApplicationSecretsHandler).get('/api/ms-graph/refreshApplicationSecrets');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'not authorized' });
  });

  it('rejects unsupported HTTP methods', async () => {
    const response = await testClient(refreshApplicationSecretsHandler).post('/api/ms-graph/refreshApplicationSecrets');

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
  });

  it('reports when there are no secrets expiring within ten days', async () => {
    await createRequestWithEntraClient({ id: 1, expiresInDays: 11 });

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets?daysUntilExpiry=10')
      .set('Authorization', 'test');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'No expiring Entra clients found' });
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('refreshes an expiring secret, updates Keycloak, and removes the expired secret', async () => {
    const request = await createRequestWithEntraClient({ id: 2 });
    graphApi.getAppRegistration.mockResolvedValue({
      appId: `app-id-${request.id}`,
      passwordCredentials: [{ keyId: 'expired-key-id', endDateTime: new Date().toISOString() }],
    } as never);
    idp.getIdp.mockResolvedValue({ alias: request.clientId, config: { clientSecret: 'old-secret' } } as never);

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(200);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(`app-id-${request.id}`);
    await expect(getEntraClientByRequestId({ integrationId: request.id, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({ secret: 'refreshed-secret', secretExpiryDate: new Date('2029-01-01T00:00:00.000Z') }),
    ]);
    expect(idp.updateIdp).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ clientSecret: 'refreshed-secret' }) }),
      'dev',
      KC_ENTRA_IDP_REALM,
    );
    expect(graphApi.deleteExpiredEntraClientSecret).toHaveBeenCalledWith(`app-id-${request.id}`, 'expired-key-id');
  });

  it('does not update Keycloak or delete the old secret for a non-applied request', async () => {
    const request = await createRequestWithEntraClient({ id: 3, status: 'draft' });
    graphApi.getAppRegistration.mockResolvedValue({ appId: `app-id-${request.id}`, passwordCredentials: [] } as never);

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(200);
    expect(idp.getIdp).not.toHaveBeenCalled();
    expect(idp.updateIdp).not.toHaveBeenCalled();
    expect(graphApi.deleteExpiredEntraClientSecret).not.toHaveBeenCalled();
  });

  it('keeps the old secret when the Keycloak IDP no longer exists', async () => {
    const request = await createRequestWithEntraClient({ id: 4 });
    graphApi.getAppRegistration.mockResolvedValue({ appId: `app-id-${request.id}`, passwordCredentials: [] } as never);
    idp.getIdp.mockResolvedValue(undefined);

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(200);
    expect(idp.updateIdp).not.toHaveBeenCalled();
    expect(graphApi.deleteExpiredEntraClientSecret).not.toHaveBeenCalled();
  });

  it('does not remove a credential when Graph does not identify an expiring key', async () => {
    const request = await createRequestWithEntraClient({ id: 7 });
    graphApi.getAppRegistration.mockResolvedValue({ appId: `app-id-${request.id}`, passwordCredentials: [] } as never);
    idp.getIdp.mockResolvedValue({ alias: request.clientId, config: { clientSecret: 'old-secret' } } as never);

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(200);
    expect(idp.updateIdp).toHaveBeenCalled();
    expect(graphApi.deleteExpiredEntraClientSecret).not.toHaveBeenCalled();
  });

  it('returns an error when Graph cannot find the Entra application', async () => {
    await createRequestWithEntraClient({ id: 5 });
    graphApi.getAppRegistration.mockResolvedValue(null);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(422);
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('returns an error without deleting the old secret when refresh fails', async () => {
    const request = await createRequestWithEntraClient({ id: 6 });
    graphApi.getAppRegistration.mockResolvedValue({ appId: `app-id-${request.id}`, passwordCredentials: [] } as never);
    const error = new Error('invalid Entra response');
    graphApi.refreshAppRegistrationSecret.mockRejectedValue(error);
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(422);
    expect(graphApi.deleteExpiredEntraClientSecret).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('returns an error without deleting the old secret when the Keycloak update fails', async () => {
    const request = await createRequestWithEntraClient({ id: 8 });
    graphApi.getAppRegistration.mockResolvedValue({
      appId: `app-id-${request.id}`,
      passwordCredentials: [{ keyId: 'expired-key-id', endDateTime: new Date().toISOString() }],
    } as never);
    idp.getIdp.mockResolvedValue({ alias: request.clientId, config: { clientSecret: 'old-secret' } } as never);
    idp.updateIdp.mockRejectedValue(new Error('Keycloak unavailable'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    const response = await testClient(refreshApplicationSecretsHandler)
      .get('/api/ms-graph/refreshApplicationSecrets')
      .set('Authorization', 'test');

    expect(response.status).toBe(422);
    expect(graphApi.deleteExpiredEntraClientSecret).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
