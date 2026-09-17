import refreshApplicationSecretsHandler from '@app/pages/api/ms-graph/refreshApplicationSecrets';
import { cleanUpDatabaseTables } from './helpers/utils';
import { testClient } from './helpers/test-client';
import { generateRequest } from './helpers/modules/integrations';
import { formDataDev } from './helpers/fixtures';
import { getEntraClientByRequestId, saveEntraClient } from '@app/queries/entra-client';
import { Status } from '@app/shared/interfaces';
import { KC_ENTRA_IDP_REALM } from '@app/utils/constants';

jest.mock('@app/utils/graph-api', () => ({
  deleteAppRegistrationSecret: jest.fn(),
  getAppRegistrationByAppId: jest.fn(),
  refreshAppRegistrationSecret: jest.fn(),
}));
jest.mock('@app/keycloak/idp', () => ({
  getIdp: jest.fn(),
  updateIdp: jest.fn(),
}));

const graphApi = jest.requireMock('@app/utils/graph-api') as jest.Mocked<typeof import('@app/utils/graph-api')>;
const idp = jest.requireMock('@app/keycloak/idp') as jest.Mocked<typeof import('@app/keycloak/idp')>;

const ENDPOINT = '/api/ms-graph/refreshApplicationSecrets';
const NEW_SECRET_EXPIRY = '2029-01-01T00:00:00.000Z';
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const appIdFor = (requestId: number, environment = 'dev') => `app-id-${requestId}-${environment}`;
const keyIdFor = (requestId: number, environment = 'dev') => `old-key-id-${requestId}-${environment}`;

const appRegistration = (appId: string, passwordCredentials?: { keyId: string; endDateTime?: string }[]) => ({
  id: `object-id-${appId}`,
  appId,
  passwordCredentials,
});

const createRequest = async (args: { id: number; status?: Status }) =>
  generateRequest({
    ...formDataDev,
    id: args.id,
    clientId: `entra-client-${args.id}`,
    projectName: `Entra Project ${args.id}`,
    status: args.status ?? 'applied',
  });

const createEntraClient = async (args: {
  requestId: number;
  environment?: string;
  expiresInDays?: number;
  secretKeyId?: string | null;
}) => {
  const environment = args.environment ?? 'dev';
  return saveEntraClient({
    appName: `entra-project-${args.requestId}-${environment}`,
    appId: appIdFor(args.requestId, environment),
    secret: `old-secret-${args.requestId}`,
    secretKeyId: (args.secretKeyId === undefined ? keyIdFor(args.requestId, environment) : args.secretKeyId) as string,
    servicePrincipalId: `service-principal-id-${args.requestId}`,
    secretExpiryDate: new Date(Date.now() + (args.expiresInDays ?? 1) * DAY_IN_MS),
    environment,
    requestId: args.requestId,
  });
};

const createRequestWithEntraClient = async (args: {
  id: number;
  status?: Status;
  environment?: string;
  expiresInDays?: number;
  secretKeyId?: string | null;
}) => {
  const request = await createRequest(args);
  await createEntraClient({ ...args, requestId: request.id });
  return request;
};

const callEndpoint = (query = '') =>
  testClient(refreshApplicationSecretsHandler)
    .get(`${ENDPOINT}${query}`)
    .set('Authorization', process.env.API_AUTH_SECRET as string);

beforeEach(async () => {
  // Every spec asserts on batch totals, so start from an empty set of Entra clients.
  await cleanUpDatabaseTables();
  // resetAllMocks (not clearAllMocks) so a rejected implementation cannot leak into the next spec.
  jest.resetAllMocks();
  graphApi.getAppRegistrationByAppId.mockImplementation(async (appId: string) => appRegistration(appId, []) as never);
  graphApi.refreshAppRegistrationSecret.mockResolvedValue({
    secretText: 'refreshed-secret',
    keyId: 'refreshed-secret-key-id',
    endDateTime: NEW_SECRET_EXPIRY,
  } as never);
  idp.getIdp.mockResolvedValue({ alias: 'entra-client', config: { clientSecret: 'old-secret' } } as never);
});

describe('refreshApplicationSecrets authorization', () => {
  it('rejects a request without the API authorization secret', async () => {
    const response = await testClient(refreshApplicationSecretsHandler).get(ENDPOINT);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ success: false, message: 'not authorized' });
  });

  it('rejects a request with the wrong API authorization secret', async () => {
    const response = await testClient(refreshApplicationSecretsHandler).get(ENDPOINT).set('Authorization', 'nope');

    expect(response.status).toBe(401);
    expect(graphApi.getAppRegistrationByAppId).not.toHaveBeenCalled();
  });

  it('rejects every request when the API authorization secret is not configured', async () => {
    const secret = process.env.API_AUTH_SECRET;
    delete process.env.API_AUTH_SECRET;

    const response = await testClient(refreshApplicationSecretsHandler).get(ENDPOINT).set('Authorization', 'test');

    expect(response.status).toBe(401);
    process.env.API_AUTH_SECRET = secret;
  });

  it('rejects unsupported HTTP methods', async () => {
    const response = await testClient(refreshApplicationSecretsHandler).post(ENDPOINT);

    expect(response.status).toBe(405);
    expect(response.headers.allow).toBe('GET');
  });
});

describe('refreshApplicationSecrets daysUntilExpiry', () => {
  it('rejects a non-numeric daysUntilExpiry', async () => {
    const response = await callEndpoint('?daysUntilExpiry=soon');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'daysUntilExpiry must be a non-negative number' });
    expect(graphApi.getAppRegistrationByAppId).not.toHaveBeenCalled();
  });

  it('rejects a negative daysUntilExpiry', async () => {
    const response = await callEndpoint('?daysUntilExpiry=-1');

    expect(response.status).toBe(400);
    expect(graphApi.getAppRegistrationByAppId).not.toHaveBeenCalled();
  });

  it('accepts a daysUntilExpiry of zero and only considers already expired secrets', async () => {
    await createRequestWithEntraClient({ id: 1, expiresInDays: 1 });

    const response = await callEndpoint('?daysUntilExpiry=0');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'No expiring Entra clients found' });
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('reports when no stored secret expires within the requested window', async () => {
    await createRequestWithEntraClient({ id: 2, expiresInDays: 11 });

    const response = await callEndpoint('?daysUntilExpiry=10');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, message: 'No expiring Entra clients found' });
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('defaults to a 21 day window when daysUntilExpiry is omitted', async () => {
    await createRequestWithEntraClient({ id: 3, expiresInDays: 20 });
    await createRequestWithEntraClient({ id: 4, expiresInDays: 22 });

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledTimes(1);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(3));
  });
});

describe('refreshApplicationSecrets rotation', () => {
  it('refreshes an expiring secret, updates Keycloak, and retires the superseded credential', async () => {
    const request = await createRequestWithEntraClient({ id: 5 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(5), [{ keyId: keyIdFor(5), endDateTime: new Date().toISOString() }]) as never,
    );

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      message: 'Request processed successfully',
      total: 1,
      processed: 1,
      failures: [],
    });
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(5));
    await expect(getEntraClientByRequestId({ integrationId: request.id, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({
        secret: 'refreshed-secret',
        secretKeyId: 'refreshed-secret-key-id',
        secretExpiryDate: new Date(NEW_SECRET_EXPIRY),
      }),
    ]);
    expect(idp.getIdp).toHaveBeenCalledWith('dev', request.clientId, KC_ENTRA_IDP_REALM);
    expect(idp.updateIdp).toHaveBeenCalledWith(
      expect.objectContaining({ config: expect.objectContaining({ clientSecret: 'refreshed-secret' }) }),
      'dev',
      KC_ENTRA_IDP_REALM,
    );
    expect(graphApi.deleteAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(5), keyIdFor(5));
  });

  it('skips a client whose credential in Entra outlives the window', async () => {
    await createRequestWithEntraClient({ id: 6 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(6), [{ keyId: keyIdFor(6), endDateTime: '2099-01-01T00:00:00.000Z' }]) as never,
    );

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true, total: 1, processed: 0, failures: [] }));
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
    expect(idp.updateIdp).not.toHaveBeenCalled();
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('refreshes when the tracked credential is no longer present in Entra', async () => {
    await createRequestWithEntraClient({ id: 7 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(7), [{ keyId: 'some-other-key-id', endDateTime: '2099-01-01T00:00:00.000Z' }]) as never,
    );

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(1);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(7));
    // Nothing to retire: the previously tracked credential is already gone from Entra.
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('refreshes when the app registration reports no credentials at all', async () => {
    await createRequestWithEntraClient({ id: 8 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(appRegistration(appIdFor(8), undefined) as never);

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(1);
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('refreshes a client that has never had a tracked credential id', async () => {
    await createRequestWithEntraClient({ id: 9, secretKeyId: null });

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(1);
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('rotates every environment of the same integration', async () => {
    const request = await createRequest({ id: 10 });
    await createEntraClient({ requestId: request.id, environment: 'dev' });
    await createEntraClient({ requestId: request.id, environment: 'test' });

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true, total: 2, processed: 2 }));
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(10, 'dev'));
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(10, 'test'));
    expect(idp.updateIdp).toHaveBeenCalledWith(expect.anything(), 'dev', KC_ENTRA_IDP_REALM);
    expect(idp.updateIdp).toHaveBeenCalledWith(expect.anything(), 'test', KC_ENTRA_IDP_REALM);
  });
});

describe('refreshApplicationSecrets Keycloak propagation', () => {
  it('does not touch Keycloak for a request that is not applied', async () => {
    await createRequestWithEntraClient({ id: 11, status: 'draft' });

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(1);
    expect(idp.getIdp).not.toHaveBeenCalled();
    expect(idp.updateIdp).not.toHaveBeenCalled();
  });

  it('retires the superseded credential even when the Keycloak IDP no longer exists', async () => {
    await createRequestWithEntraClient({ id: 12 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(12), [{ keyId: keyIdFor(12), endDateTime: new Date().toISOString() }]) as never,
    );
    idp.getIdp.mockResolvedValue(undefined);

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.processed).toBe(1);
    expect(idp.updateIdp).not.toHaveBeenCalled();
    expect(graphApi.deleteAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(12), keyIdFor(12));
  });

  it('skips an archived or missing integration without failing the batch', async () => {
    const request = await createRequest({ id: 13 });
    await createEntraClient({ requestId: request.id });
    await request.update({ archived: true });

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: true, processed: 1, failures: [] }));
    expect(idp.updateIdp).not.toHaveBeenCalled();
  });
});

describe('refreshApplicationSecrets failure handling', () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it('reports a failure when Graph cannot find the Entra application', async () => {
    await createRequestWithEntraClient({ id: 14 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(null);

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        total: 1,
        processed: 0,
        failures: [
          {
            appId: appIdFor(14),
            environment: 'dev',
            message: `Entra application registration not found for appId ${appIdFor(14)}`,
          },
        ],
      }),
    );
    expect(graphApi.refreshAppRegistrationSecret).not.toHaveBeenCalled();
  });

  it('reports a failure and keeps the stored secret when Graph rejects the refresh', async () => {
    const request = await createRequestWithEntraClient({ id: 15 });
    graphApi.refreshAppRegistrationSecret.mockRejectedValue(new Error('invalid Entra response'));

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.failures).toEqual([
      expect.objectContaining({ appId: appIdFor(15), message: 'invalid Entra response' }),
    ]);
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
    await expect(getEntraClientByRequestId({ integrationId: request.id, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({ secret: 'old-secret-15', secretKeyId: keyIdFor(15) }),
    ]);
  });

  it('reports a failure when Graph returns a credential without a secret value', async () => {
    const request = await createRequestWithEntraClient({ id: 16 });
    graphApi.refreshAppRegistrationSecret.mockResolvedValue({ keyId: 'no-secret-text', endDateTime: null } as never);

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.failures).toEqual([
      expect.objectContaining({ message: `Entra did not return a new secret for appId ${appIdFor(16)}` }),
    ]);
    await expect(getEntraClientByRequestId({ integrationId: request.id, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({ secret: 'old-secret-16' }),
    ]);
  });

  it('persists the rotated secret but keeps the old credential when the Keycloak update fails', async () => {
    const request = await createRequestWithEntraClient({ id: 17 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(17), [{ keyId: keyIdFor(17), endDateTime: new Date().toISOString() }]) as never,
    );
    idp.updateIdp.mockRejectedValue(new Error('Keycloak unavailable'));

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.failures).toEqual([expect.objectContaining({ message: 'Keycloak unavailable' })]);
    expect(graphApi.deleteAppRegistrationSecret).not.toHaveBeenCalled();
    // The new secret is already stored, so the next run only has to retry the Keycloak update.
    await expect(getEntraClientByRequestId({ integrationId: request.id, environment: 'dev' })).resolves.toEqual([
      expect.objectContaining({ secret: 'refreshed-secret', secretKeyId: 'refreshed-secret-key-id' }),
    ]);
  });

  it('reports a failure when the superseded credential cannot be removed', async () => {
    await createRequestWithEntraClient({ id: 18 });
    graphApi.getAppRegistrationByAppId.mockResolvedValue(
      appRegistration(appIdFor(18), [{ keyId: keyIdFor(18), endDateTime: new Date().toISOString() }]) as never,
    );
    graphApi.deleteAppRegistrationSecret.mockRejectedValue(new Error('removePassword failed'));

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(response.body.processed).toBe(0);
    expect(idp.updateIdp).toHaveBeenCalled();
  });

  it('keeps rotating the remaining clients when one of them fails', async () => {
    await createRequestWithEntraClient({ id: 19 });
    await createRequestWithEntraClient({ id: 20 });
    graphApi.getAppRegistrationByAppId.mockImplementation(async (appId: string) =>
      appId === appIdFor(19) ? null : (appRegistration(appId, []) as never),
    );

    const response = await callEndpoint();

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ success: false, total: 2, processed: 1 }));
    expect(response.body.failures).toEqual([expect.objectContaining({ appId: appIdFor(19) })]);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledTimes(1);
    expect(graphApi.refreshAppRegistrationSecret).toHaveBeenCalledWith(appIdFor(20));
  });
});
