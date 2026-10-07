import { KeyCredential } from '@microsoft/microsoft-graph-types';
import handler from '@app/pages/api/ms-graph/refreshApplicationKeyCredentials';
import { computeThumbprint } from '@app/utils/entra-helpers';
import { KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID } from '@app/utils/constants';
import { testClient } from './helpers/test-client';

jest.mock('@app/keycloak/keys', () => ({
  createPS256Key: jest.fn(),
  getActivePS256KeyProvider: jest.fn(),
  getKeyCertByProviderId: jest.fn(),
  removeRealmKey: jest.fn(),
  updateRealmKeyProvider: jest.fn(),
}));
jest.mock('@app/utils/graph-api', () => ({
  getAppRegistrationByAppId: jest.fn(),
  replaceKeyCredentials: jest.fn(),
}));
jest.mock('@app/queries/entra-client', () => ({
  fetchAllEntraClients: jest.fn(),
}));
// X.509 parsing belongs to the helper's own tests; here only the thumbprint has to be faithful.
jest.mock('@app/utils/entra-helpers', () => {
  const actual = jest.requireActual('@app/utils/entra-helpers');
  return {
    ...actual,
    buildKeyCredential: (displayName: string, _certPem: string, certRawBase64: string, kid: string) => ({
      type: 'AsymmetricX509Cert',
      usage: 'Verify',
      displayName: `${displayName} key credential (kid: ${kid})`,
      key: certRawBase64,
      customKeyIdentifier: actual.computeThumbprint(certRawBase64),
      startDateTime: '2026-01-01T00:00:00.000Z',
      endDateTime: '2028-01-01T00:00:00.000Z',
    }),
  };
});

const keys = jest.requireMock('@app/keycloak/keys') as jest.Mocked<typeof import('@app/keycloak/keys')>;
const graphApi = jest.requireMock('@app/utils/graph-api') as jest.Mocked<typeof import('@app/utils/graph-api')>;
const entraClientQueries = jest.requireMock('@app/queries/entra-client') as jest.Mocked<
  typeof import('@app/queries/entra-client')
>;

const ENDPOINT = '/api/ms-graph/refreshApplicationKeyCredentials';
const AUTH_SECRET = 'rotation-secret';

const OLD_PROVIDER_ID = 'old-provider-id';
const NEW_PROVIDER_ID = 'new-provider-id';
const OLD_CERT_RAW = Buffer.from('old-certificate').toString('base64');
const NEW_CERT_RAW = Buffer.from('new-certificate').toString('base64');
const OLD_THUMBPRINT = computeThumbprint(OLD_CERT_RAW);
const NEW_THUMBPRINT = computeThumbprint(NEW_CERT_RAW);

const certFor = (rawBase64: string, kid: string) => ({
  kid,
  certificateRawBase64: rawBase64,
  certificatePem: `-----BEGIN CERTIFICATE-----\n${rawBase64}\n-----END CERTIFICATE-----`,
});

const OLD_CERT = certFor(OLD_CERT_RAW, 'old-kid');
const NEW_CERT = certFor(NEW_CERT_RAW, 'new-kid');

const objectIdFor = (appId: string) => `object-${appId}`;

/** Stands in for the Entra directory so the handler's read-back verification exercises real state. */
const entraStore = new Map<string, KeyCredential[]>();

const thumbprintsOn = (appId: string) =>
  (entraStore.get(objectIdFor(appId)) ?? []).map((credential) => credential.customKeyIdentifier);

type FakeEntraClient = { appId: string; environment: string; keyThumbprint: string | null; save: jest.Mock };

const makeClient = (appId: string, environment = 'dev'): FakeEntraClient => {
  entraStore.set(objectIdFor(appId), [{ customKeyIdentifier: OLD_THUMBPRINT, key: OLD_CERT_RAW } as KeyCredential]);

  return {
    appId,
    environment,
    keyThumbprint: OLD_THUMBPRINT,
    save: jest.fn().mockResolvedValue(undefined),
  };
};

const setClients = (clientsByEnvironment: Record<string, FakeEntraClient[]>) => {
  entraClientQueries.fetchAllEntraClients.mockImplementation((environment: string) =>
    Promise.resolve((clientsByEnvironment[environment] ?? []) as never),
  );
};

const rotate = (query = '') => testClient(handler).get(`${ENDPOINT}${query}`).set('Authorization', AUTH_SECRET);

const resultFor = (body: any, environment: string) =>
  body.results.find((result: any) => result.environment === environment);

const callOrder = (mock: jest.Mock, index = 0) => mock.mock.invocationCallOrder[index];

const credentialCallsFor = (appId: string) =>
  graphApi.replaceKeyCredentials.mock.calls
    .filter((call: any[]) => call[0].id === objectIdFor(appId))
    .map((call: any[]) => call[1].map((credential: KeyCredential) => credential.customKeyIdentifier));

let consoleError: jest.SpyInstance;
let setTimeoutSpy: jest.SpyInstance | undefined;

/** Collapses the handler's eventual-consistency backoff so the retry paths do not stall the suite. */
const skipVerificationBackoff = () => {
  const realSetTimeout = global.setTimeout;
  setTimeoutSpy = jest
    .spyOn(global, 'setTimeout')
    .mockImplementation(((callback: () => void, ms?: number, ...args: unknown[]) =>
      ms === 3000 ? (callback(), 0) : (realSetTimeout as any)(callback, ms, ...args)) as never);
};

beforeEach(() => {
  jest.clearAllMocks();
  entraStore.clear();
  consoleError = jest.spyOn(console, 'error').mockImplementation();
  process.env.API_AUTH_SECRET = AUTH_SECRET;

  keys.getActivePS256KeyProvider.mockResolvedValue({
    id: OLD_PROVIDER_ID,
    name: KC_PS256_KEY_PROVIDER_ID,
    priority: 0,
  });
  keys.createPS256Key.mockResolvedValue({ id: NEW_PROVIDER_ID });
  keys.getKeyCertByProviderId.mockImplementation((providerId: string) =>
    Promise.resolve(providerId === NEW_PROVIDER_ID ? NEW_CERT : OLD_CERT),
  );
  keys.updateRealmKeyProvider.mockResolvedValue(undefined);
  keys.removeRealmKey.mockResolvedValue(undefined);

  graphApi.getAppRegistrationByAppId.mockImplementation((appId: string) =>
    Promise.resolve({
      id: objectIdFor(appId),
      appId,
      displayName: `display-${appId}`,
      keyCredentials: entraStore.get(objectIdFor(appId)) ?? [],
    } as never),
  );
  graphApi.replaceKeyCredentials.mockImplementation((appReg: any, credentials: KeyCredential[]) => {
    entraStore.set(appReg.id, credentials);
    return Promise.resolve();
  });

  setClients({ dev: [makeClient('app-dev-1')] });
});

afterEach(() => {
  setTimeoutSpy?.mockRestore();
  setTimeoutSpy = undefined;
  consoleError.mockRestore();
});

describe('refreshApplicationKeyCredentials authorization', () => {
  it('rejects a request without an authorization header', async () => {
    const response = await testClient(handler).get(ENDPOINT);

    expect(response.status).toBe(401);
    expect(keys.createPS256Key).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong authorization header', async () => {
    const response = await testClient(handler).get(ENDPOINT).set('Authorization', 'nope');

    expect(response.status).toBe(401);
    expect(keys.createPS256Key).not.toHaveBeenCalled();
  });

  it('rejects every request when the shared secret is not configured', async () => {
    delete process.env.API_AUTH_SECRET;

    const response = await testClient(handler).get(ENDPOINT).set('Authorization', 'undefined');

    expect(response.status).toBe(401);
    expect(keys.createPS256Key).not.toHaveBeenCalled();
  });

  it('rejects methods other than GET', async () => {
    const response = await testClient(handler).post(ENDPOINT).set('Authorization', AUTH_SECRET);

    expect(response.status).toBe(405);
    expect(keys.createPS256Key).not.toHaveBeenCalled();
  });
});

describe('refreshApplicationKeyCredentials environment selection', () => {
  it('rejects an unknown environment', async () => {
    const response = await rotate('?environment=sandbox');

    expect(response.status).toBe(400);
    expect(keys.getActivePS256KeyProvider).not.toHaveBeenCalled();
  });

  it('rotates only the requested environment', async () => {
    const response = await rotate('?environment=dev');

    expect(response.body.results).toHaveLength(1);
    expect(resultFor(response.body, 'dev')).toEqual(expect.objectContaining({ rotated: true }));
    expect(keys.getActivePS256KeyProvider).toHaveBeenCalledTimes(1);
    expect(keys.getActivePS256KeyProvider).toHaveBeenCalledWith('dev', KC_ENTRA_IDP_REALM, KC_PS256_KEY_PROVIDER_ID);
  });

  it('rotates dev, test, and prod when no environment is given', async () => {
    setClients({ dev: [makeClient('app-dev-1')], test: [makeClient('app-test-1', 'test')], prod: [] });

    const response = await rotate();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.results.map((result: any) => result.environment)).toEqual(['dev', 'test', 'prod']);
    expect(response.body.results.every((result: any) => result.rotated)).toBe(true);
    expect(keys.createPS256Key).toHaveBeenCalledTimes(3);
  });
});

describe('refreshApplicationKeyCredentials rotation', () => {
  it('trusts both certificates, then cuts over, then drops the stale one', async () => {
    const client = makeClient('app-dev-1');
    setClients({ dev: [client] });

    const response = await rotate('?environment=dev');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(resultFor(response.body, 'dev')).toEqual({
      environment: 'dev',
      rotated: true,
      clients: 1,
      cleanupFailures: [],
    });

    // Both certificates are trusted during the overlap, then only the new one survives.
    expect(credentialCallsFor('app-dev-1')).toEqual([[OLD_THUMBPRINT, NEW_THUMBPRINT], [NEW_THUMBPRINT]]);
    expect(thumbprintsOn('app-dev-1')).toEqual([NEW_THUMBPRINT]);
    expect(client.keyThumbprint).toBe(NEW_THUMBPRINT);
    expect(client.save).toHaveBeenCalledTimes(1);
  });

  it('sends the certificate bytes rather than round-tripping the credentials Graph returns', async () => {
    await rotate('?environment=dev');

    const [appReg, credentials] = graphApi.replaceKeyCredentials.mock.calls[0] as any[];
    expect(appReg.id).toBe(objectIdFor('app-dev-1'));
    expect(credentials).toEqual([
      expect.objectContaining({ customKeyIdentifier: OLD_THUMBPRINT, key: OLD_CERT_RAW }),
      expect.objectContaining({
        type: 'AsymmetricX509Cert',
        usage: 'Verify',
        customKeyIdentifier: NEW_THUMBPRINT,
        key: NEW_CERT_RAW,
      }),
    ]);
    expect(credentials.every((credential: KeyCredential) => credential.key)).toBe(true);
  });

  it('creates the standby provider below the live key and only then cuts it over', async () => {
    await rotate('?environment=dev');

    expect(keys.createPS256Key).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${KC_PS256_KEY_PROVIDER_ID}-\\d+$`)),
      'dev',
      KC_ENTRA_IDP_REALM,
      0,
    );
    expect(keys.updateRealmKeyProvider).toHaveBeenCalledWith('dev', KC_ENTRA_IDP_REALM, NEW_PROVIDER_ID, {
      priority: 200,
    });

    const cutover = keys.updateRealmKeyProvider.mock.calls.findIndex(
      (call: any[]) => call[2] === NEW_PROVIDER_ID && call[3].priority === 200,
    );
    expect(callOrder(graphApi.replaceKeyCredentials as jest.Mock)).toBeLessThan(
      keys.updateRealmKeyProvider.mock.invocationCallOrder[cutover],
    );
    expect(keys.updateRealmKeyProvider.mock.invocationCallOrder[cutover]).toBeLessThan(
      callOrder(keys.removeRealmKey as jest.Mock),
    );
  });

  it('reclaims the canonical provider name after the previous provider is deleted', async () => {
    await rotate('?environment=dev');

    expect(keys.removeRealmKey).toHaveBeenCalledWith('dev', OLD_PROVIDER_ID, KC_ENTRA_IDP_REALM);
    expect(keys.updateRealmKeyProvider).toHaveBeenLastCalledWith('dev', KC_ENTRA_IDP_REALM, NEW_PROVIDER_ID, {
      name: KC_PS256_KEY_PROVIDER_ID,
      priority: 100,
    });
    expect(callOrder(keys.removeRealmKey as jest.Mock)).toBeLessThan(
      keys.updateRealmKeyProvider.mock.invocationCallOrder[keys.updateRealmKeyProvider.mock.calls.length - 1],
    );
  });

  it('normalizes the live provider priority so the standby key cannot outrank it', async () => {
    const response = await rotate('?environment=dev');

    expect(keys.updateRealmKeyProvider).toHaveBeenCalledWith('dev', KC_ENTRA_IDP_REALM, OLD_PROVIDER_ID, {
      priority: 100,
    });
    expect(callOrder(keys.updateRealmKeyProvider as jest.Mock)).toBeLessThan(
      callOrder(keys.createPS256Key as jest.Mock),
    );
    expect(response.body.success).toBe(true);
  });

  it('leaves the live provider priority alone when it is already normalized', async () => {
    keys.getActivePS256KeyProvider.mockResolvedValue({
      id: OLD_PROVIDER_ID,
      name: KC_PS256_KEY_PROVIDER_ID,
      priority: 100,
    });

    await rotate('?environment=dev');

    expect(keys.updateRealmKeyProvider).not.toHaveBeenCalledWith(
      'dev',
      KC_ENTRA_IDP_REALM,
      OLD_PROVIDER_ID,
      expect.anything(),
    );
  });

  it('adds the new certificate to every registration before cutting over', async () => {
    setClients({ dev: [makeClient('app-dev-1'), makeClient('app-dev-2'), makeClient('app-dev-3')] });

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev').clients).toBe(3);
    ['app-dev-1', 'app-dev-2', 'app-dev-3'].forEach((appId) => {
      expect(thumbprintsOn(appId)).toEqual([NEW_THUMBPRINT]);
    });

    const cutover = keys.updateRealmKeyProvider.mock.calls.findIndex(
      (call: any[]) => call[2] === NEW_PROVIDER_ID && call[3].priority === 200,
    );
    const cutoverOrder = keys.updateRealmKeyProvider.mock.invocationCallOrder[cutover];
    const uploads = graphApi.replaceKeyCredentials.mock.calls
      .map((call: any[], index: number) => ({ credentials: call[1], index }))
      .filter(({ credentials }) => credentials.length === 2);

    uploads.forEach(({ index }) => {
      expect(graphApi.replaceKeyCredentials.mock.invocationCallOrder[index]).toBeLessThan(cutoverOrder);
    });
    expect(uploads).toHaveLength(3);
  });

  it('retries the verification read until the directory catches up', async () => {
    skipVerificationBackoff();
    const read = graphApi.getAppRegistrationByAppId.getMockImplementation()!;
    let reads = 0;
    // The first read feeds the update; the next two model a directory that has not converged yet.
    graphApi.getAppRegistrationByAppId.mockImplementation((appId: string) => {
      reads += 1;
      return reads > 1 && reads < 4
        ? Promise.resolve({
            id: objectIdFor(appId),
            appId,
            displayName: `display-${appId}`,
            keyCredentials: [],
          } as never)
        : read(appId);
    });

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev').rotated).toBe(true);
    expect(reads).toBe(4);
    expect(thumbprintsOn('app-dev-1')).toEqual([NEW_THUMBPRINT]);
  });

  it('rotates the keys even when the environment has no Entra clients', async () => {
    setClients({ dev: [] });

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({ rotated: true, clients: 0, cleanupFailures: [] }),
    );
    expect(graphApi.replaceKeyCredentials).not.toHaveBeenCalled();
    expect(keys.removeRealmKey).toHaveBeenCalledWith('dev', OLD_PROVIDER_ID, KC_ENTRA_IDP_REALM);
  });

  it('uploads only the new certificate when the previous provider exposes none', async () => {
    keys.getKeyCertByProviderId.mockImplementation((providerId: string) =>
      Promise.resolve(providerId === NEW_PROVIDER_ID ? NEW_CERT : null),
    );

    const response = await rotate('?environment=dev');

    expect(credentialCallsFor('app-dev-1')).toEqual([[NEW_THUMBPRINT]]);
    expect(resultFor(response.body, 'dev').rotated).toBe(true);
  });

  it('does not re-upload when the certificate is unchanged', async () => {
    keys.getKeyCertByProviderId.mockResolvedValue(NEW_CERT);

    await rotate('?environment=dev');

    expect(credentialCallsFor('app-dev-1')).toEqual([[NEW_THUMBPRINT]]);
  });
});

describe('refreshApplicationKeyCredentials abort before cutover', () => {
  it('fails the environment when no PS256 provider exists', async () => {
    keys.getActivePS256KeyProvider.mockResolvedValue(null);

    const response = await rotate('?environment=dev');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: false,
        clients: 0,
        message: expect.stringContaining('no PS256 key provider'),
      }),
    );
    expect(keys.createPS256Key).not.toHaveBeenCalled();
    expect(graphApi.replaceKeyCredentials).not.toHaveBeenCalled();
  });

  it('removes the standby provider when Keycloak exposes no certificate for the new key', async () => {
    keys.getKeyCertByProviderId.mockImplementation((providerId: string) =>
      Promise.resolve(providerId === NEW_PROVIDER_ID ? null : OLD_CERT),
    );

    const response = await rotate('?environment=dev');

    expect(keys.removeRealmKey).toHaveBeenCalledTimes(1);
    expect(keys.removeRealmKey).toHaveBeenCalledWith('dev', NEW_PROVIDER_ID, KC_ENTRA_IDP_REALM);
    expect(graphApi.replaceKeyCredentials).not.toHaveBeenCalled();
    expect(resultFor(response.body, 'dev').rotated).toBe(false);
  });

  it('aborts when Entra silently drops the new credential', async () => {
    skipVerificationBackoff();
    graphApi.replaceKeyCredentials.mockResolvedValue(undefined);

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: false,
        message: 'Entra did not persist the new key credential for appId app-dev-1',
      }),
    );
    expect(keys.removeRealmKey).toHaveBeenCalledWith('dev', NEW_PROVIDER_ID, KC_ENTRA_IDP_REALM);
    expect(keys.updateRealmKeyProvider).not.toHaveBeenCalledWith(
      'dev',
      KC_ENTRA_IDP_REALM,
      NEW_PROVIDER_ID,
      expect.objectContaining({ priority: 200 }),
    );
  });

  it('aborts and restores the previous credentials when a registration is missing', async () => {
    setClients({ dev: [makeClient('app-dev-1'), makeClient('app-dev-2')] });
    graphApi.getAppRegistrationByAppId.mockImplementation((appId: string) =>
      Promise.resolve(
        appId === 'app-dev-2'
          ? null
          : ({
              id: objectIdFor(appId),
              appId,
              displayName: `display-${appId}`,
              keyCredentials: entraStore.get(objectIdFor(appId)) ?? [],
            } as never),
      ),
    );

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({ rotated: false, message: expect.stringContaining('app-dev-2') }),
    );
    expect(credentialCallsFor('app-dev-1')).toEqual([[OLD_THUMBPRINT, NEW_THUMBPRINT], [OLD_THUMBPRINT]]);
    expect(thumbprintsOn('app-dev-1')).toEqual([OLD_THUMBPRINT]);
    expect(keys.removeRealmKey).toHaveBeenCalledWith('dev', NEW_PROVIDER_ID, KC_ENTRA_IDP_REALM);
    expect(keys.removeRealmKey).not.toHaveBeenCalledWith('dev', OLD_PROVIDER_ID, KC_ENTRA_IDP_REALM);
    expect(keys.updateRealmKeyProvider).not.toHaveBeenCalledWith(
      'dev',
      KC_ENTRA_IDP_REALM,
      NEW_PROVIDER_ID,
      expect.objectContaining({ priority: 200 }),
    );
  });

  it('rolls back only the registrations that were already updated', async () => {
    setClients({ dev: [makeClient('app-dev-1'), makeClient('app-dev-2'), makeClient('app-dev-3')] });
    const replace = graphApi.replaceKeyCredentials.getMockImplementation()!;
    graphApi.replaceKeyCredentials.mockImplementation((appReg: any, credentials: KeyCredential[]) =>
      appReg.id === objectIdFor('app-dev-3')
        ? Promise.reject(new Error('Graph rejected the certificate'))
        : replace(appReg, credentials),
    );

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({ rotated: false, message: 'Graph rejected the certificate' }),
    );
    expect(thumbprintsOn('app-dev-1')).toEqual([OLD_THUMBPRINT]);
    expect(thumbprintsOn('app-dev-2')).toEqual([OLD_THUMBPRINT]);
    expect(credentialCallsFor('app-dev-3')).toEqual([[OLD_THUMBPRINT, NEW_THUMBPRINT]]);
  });

  it('still reports the original failure when the rollback itself fails', async () => {
    skipVerificationBackoff();
    setClients({ dev: [makeClient('app-dev-1'), makeClient('app-dev-2')] });
    graphApi.replaceKeyCredentials
      .mockResolvedValueOnce(undefined)
      .mockRejectedValue(new Error('Graph rejected the certificate'));
    keys.removeRealmKey.mockRejectedValue(new Error('provider delete failed'));

    const response = await rotate('?environment=dev');

    expect(response.status).toBe(200);
    expect(resultFor(response.body, 'dev')).toEqual(expect.objectContaining({ rotated: false }));
  });

  it('does not touch the Entra registrations when the standby provider cannot be created', async () => {
    keys.createPS256Key.mockRejectedValue(new Error('keycloak unavailable'));

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({ rotated: false, message: 'keycloak unavailable' }),
    );
    expect(graphApi.replaceKeyCredentials).not.toHaveBeenCalled();
    expect(keys.removeRealmKey).not.toHaveBeenCalled();
  });
});

describe('refreshApplicationKeyCredentials cleanup after cutover', () => {
  it('reports a stale credential removal failure without failing the rotation', async () => {
    const client = makeClient('app-dev-1');
    setClients({ dev: [client] });
    const replace = graphApi.replaceKeyCredentials.getMockImplementation()!;
    graphApi.replaceKeyCredentials.mockImplementation((appReg: any, credentials: KeyCredential[]) =>
      credentials.length === 1 ? Promise.reject(new Error('removePassword failed')) : replace(appReg, credentials),
    );

    const response = await rotate('?environment=dev');

    expect(response.body.success).toBe(false);
    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: true,
        cleanupFailures: [{ appId: 'app-dev-1', message: 'removePassword failed' }],
      }),
    );
    expect(keys.updateRealmKeyProvider).toHaveBeenCalledWith('dev', KC_ENTRA_IDP_REALM, NEW_PROVIDER_ID, {
      priority: 200,
    });
    expect(client.save).not.toHaveBeenCalled();
  });

  it('reports a persistence failure and keeps cleaning up the remaining clients', async () => {
    const failing = makeClient('app-dev-1');
    const healthy = makeClient('app-dev-2');
    failing.save.mockRejectedValue(new Error('database unavailable'));
    setClients({ dev: [failing, healthy] });

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: true,
        cleanupFailures: [{ appId: 'app-dev-1', message: 'database unavailable' }],
      }),
    );
    expect(healthy.keyThumbprint).toBe(NEW_THUMBPRINT);
    expect(healthy.save).toHaveBeenCalledTimes(1);
  });

  it('reports a failure to retire the previous key provider and keeps the standby name', async () => {
    keys.removeRealmKey.mockRejectedValue(new Error('provider delete failed'));

    const response = await rotate('?environment=dev');

    expect(response.body.success).toBe(false);
    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: true,
        cleanupFailures: [{ appId: KC_PS256_KEY_PROVIDER_ID, message: 'provider delete failed' }],
      }),
    );
    expect(keys.updateRealmKeyProvider).not.toHaveBeenCalledWith(
      'dev',
      KC_ENTRA_IDP_REALM,
      NEW_PROVIDER_ID,
      expect.objectContaining({ name: KC_PS256_KEY_PROVIDER_ID }),
    );
  });

  it('reports a failure to rename the standby provider', async () => {
    keys.updateRealmKeyProvider.mockImplementation((_env: string, _realm: string, _id: string, updates: any) =>
      updates.name ? Promise.reject(new Error('rename failed')) : Promise.resolve(),
    );

    const response = await rotate('?environment=dev');

    expect(resultFor(response.body, 'dev')).toEqual(
      expect.objectContaining({
        rotated: true,
        cleanupFailures: [{ appId: KC_PS256_KEY_PROVIDER_ID, message: 'rename failed' }],
      }),
    );
  });
});

describe('refreshApplicationKeyCredentials environment isolation', () => {
  it('keeps rotating the remaining environments after one fails', async () => {
    setClients({ dev: [makeClient('app-dev-1')], test: [makeClient('app-test-1', 'test')], prod: [] });
    keys.getActivePS256KeyProvider.mockImplementation((environment: string) =>
      environment === 'dev'
        ? Promise.resolve(null)
        : Promise.resolve({ id: OLD_PROVIDER_ID, name: KC_PS256_KEY_PROVIDER_ID, priority: 100 }),
    );

    const response = await rotate();

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(false);
    expect(resultFor(response.body, 'dev').rotated).toBe(false);
    expect(resultFor(response.body, 'test').rotated).toBe(true);
    expect(resultFor(response.body, 'prod').rotated).toBe(true);
    expect(keys.createPS256Key).toHaveBeenCalledTimes(2);
    expect(thumbprintsOn('app-dev-1')).toEqual([OLD_THUMBPRINT]);
    expect(thumbprintsOn('app-test-1')).toEqual([NEW_THUMBPRINT]);
  });

  it('creates, cuts over, and renames a provider in each environment', async () => {
    setClients({ dev: [makeClient('app-dev-1')], test: [makeClient('app-test-1', 'test')], prod: [] });

    await rotate();

    ['dev', 'test', 'prod'].forEach((environment) => {
      expect(keys.createPS256Key).toHaveBeenCalledWith(expect.any(String), environment, KC_ENTRA_IDP_REALM, 0);
      expect(keys.updateRealmKeyProvider).toHaveBeenCalledWith(environment, KC_ENTRA_IDP_REALM, NEW_PROVIDER_ID, {
        priority: 200,
      });
      expect(keys.removeRealmKey).toHaveBeenCalledWith(environment, OLD_PROVIDER_ID, KC_ENTRA_IDP_REALM);
      expect(keys.updateRealmKeyProvider).toHaveBeenCalledWith(environment, KC_ENTRA_IDP_REALM, NEW_PROVIDER_ID, {
        name: KC_PS256_KEY_PROVIDER_ID,
        priority: 100,
      });
    });
  });
});
