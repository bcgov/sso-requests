import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { models } from '@app/shared/sequelize/models/models';
import { getConfiguration } from '@app/utils/authenticate';
import { getAdminClient } from '@app/keycloak/adminClient';
import { getUserById } from '@app/queries/user';
import { getPrivacyZoneURI } from '@app/utils/bcsc-client';
import { createSdxRequest, getRemovedScopes } from '@app/controllers/sdx-services';
import { SDXResourceServer, Session } from '@app/shared/interfaces';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import {
  deleteSdxAllowedAccess,
  getSdxAllowedAccess,
  getSdxAllowedAccessWithoutId,
  getSdxResourceServers,
  postSdxResourceServers,
  putSdxAllowedAccess,
  putSdxAllowedAccessWithRawAuthorization,
} from './helpers/modules/sdx';
import { cleanUpDatabaseTables } from './helpers/utils';
import { clearMockAuth, createMockAuth } from './mocks/authenticate';
import { Integration } from '@app/interfaces/Request';

jest.mock('@app/keycloak/adminClient', () => {
  return {
    getAdminClient: jest.fn(),
  };
});

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/queries/user', () => ({
  getUserById: jest.fn(),
}));

jest.mock('@app/utils/bcsc-client', () => ({
  getPrivacyZoneURI: jest.fn(),
}));

const SDX_API = 'https://sdx.example.com/api';
const SDX_TOKEN_URL = 'https://sdx.example.com/token';
const NON_PRODUCTION_ENV = 'apsdev';
const PRODUCTION_ENV = 'apstest';

const scope = (label: string) => ({ label, description: `${label} description` });

const nonProductionResourceServer: SDXResourceServer = {
  id: 'health-rs',
  name: 'Health Resource Server',
  organization: 'Ministry of Health',
  description: 'Health data services',
  environment: NON_PRODUCTION_ENV,
  services: [
    {
      name: 'patient-api',
      title: 'Patient API',
      version: 'v1',
      scopes: [scope('patient.read'), scope('patient.write')],
    },
  ],
};

const productionResourceServer: SDXResourceServer = {
  id: 'finance-rs',
  name: 'Finance Resource Server',
  organization: 'Ministry of Finance',
  environment: PRODUCTION_ENV,
  services: [{ name: 'payment-api', title: 'Payment API', version: 'v1', scopes: [scope('payment.read')] }],
};

const selectedResourceServer = (environment: string, scopes: string[], overrides: Partial<SDXResourceServer> = {}) =>
  ({
    id: 'health-rs',
    name: 'Health Resource Server',
    organization: 'Ministry of Health',
    environment,
    services: [{ name: 'patient-api', title: 'Patient API', version: 'v1', scopes }],
    ...overrides,
  } as SDXResourceServer);

const jsonResponse = (data: any, ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

type SdxFetchOptions = {
  resourceServers?: Record<string, SDXResourceServer[]>;
  allowedServices?: Record<string, SDXResourceServer[]>;
  accessRequestOk?: boolean;
  accessRequestBody?: any;
  failOn?: (url: string) => boolean;
  subsystemStatus?: string;
};

const fetchMock = jest.fn();
global.fetch = fetchMock as any;

const setUpSdxApi = (options: SdxFetchOptions = {}) => {
  fetchMock.mockImplementation(async (url: string) => {
    if (options.failOn?.(url)) throw new Error('SDX API is unavailable');

    if (url === SDX_TOKEN_URL) return jsonResponse({ access_token: 'sdx-access-token' });

    const parsed = new URL(url);
    const environment = parsed.searchParams.get('environment') || '';

    if (parsed.pathname.endsWith('/resource-servers')) {
      return jsonResponse(options.resourceServers?.[environment] ?? []);
    }

    if (parsed.pathname.endsWith('/allowed-services')) {
      const key = `${environment}:${parsed.searchParams.get('status')}`;
      return jsonResponse({ resourceServers: options.allowedServices?.[key] ?? [] });
    }

    if (parsed.pathname.endsWith('/access-requests')) {
      return jsonResponse(options.accessRequestBody ?? { submissionId: 'sdx-submission-1' }, options.accessRequestOk);
    }

    if (parsed.pathname.match(/\/integrations\/\d+$/)) {
      return jsonResponse({ status: options.subsystemStatus ?? 'registered' });
    }

    throw new Error(`Unexpected SDX call: ${url}`);
  });
};

const sdxApiCalls = (path: string) =>
  fetchMock.mock.calls.map(([url]) => String(url)).filter((url) => url.includes(path));

const keycloak = {
  clientsFind: jest.fn(),
  listDefaultClientScopes: jest.fn(),
  addDefaultClientScope: jest.fn(),
  delDefaultClientScope: jest.fn(),
  clientScopesFind: jest.fn(),
  clientScopesCreate: jest.fn(),
  clientScopesFindOneByName: jest.fn(),
};

const setUpKeycloak = ({
  existingClientScopes = [] as string[],
  existingDefaultClientScopes = [] as string[],
  clients = [{ id: 'kc-client-uuid', clientId: 'test-client' }],
} = {}) => {
  keycloak.clientsFind.mockResolvedValue(clients);
  keycloak.listDefaultClientScopes.mockResolvedValue(existingDefaultClientScopes.map((name) => ({ name })));
  keycloak.addDefaultClientScope.mockResolvedValue(undefined);
  keycloak.delDefaultClientScope.mockResolvedValue(undefined);
  keycloak.clientScopesFind.mockResolvedValue(existingClientScopes.map((name) => ({ name })));
  keycloak.clientScopesCreate.mockResolvedValue(undefined);
  keycloak.clientScopesFindOneByName.mockResolvedValue({ id: 'scope-id' });

  (getAdminClient as jest.Mock).mockImplementation(async ({ environment }: { environment: string }) => ({
    environment,
    kcAdminClient: {
      clients: {
        find: keycloak.clientsFind,
        listDefaultClientScopes: keycloak.listDefaultClientScopes,
        addDefaultClientScope: keycloak.addDefaultClientScope,
        delDefaultClientScope: keycloak.delDefaultClientScope,
      },
      clientScopes: {
        find: keycloak.clientScopesFind,
        create: keycloak.clientScopesCreate,
        findOneByName: keycloak.clientScopesFindOneByName,
      },
    },
  }));
};

const adminClientEnvironments = () => (getAdminClient as jest.Mock).mock.calls.map(([args]) => args.environment).sort();

const adminSession = {
  idir_userid: TEAM_ADMIN_IDIR_USERID_01,
  email: TEAM_ADMIN_IDIR_EMAIL_01,
  client_roles: ['sso-admin'],
  given_name: 'Test',
  family_name: 'User',
  user: { displayName: 'Test User' },
} as unknown as Session;

const signingKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const signingKeyId = randomUUID();
const issuer = 'https://sso.example.com/auth/realms/standard';

const jwks = {
  keys: [{ ...signingKeys.publicKey.export({ format: 'jwk' }), kid: signingKeyId, alg: 'RS256', use: 'sig' }],
};

const signToken = ({ keyid = signingKeyId as string, tokenIssuer = issuer, key = signingKeys.privateKey } = {}) =>
  jwt.sign({ sub: 'sdx-system' }, key, { algorithm: 'RS256', keyid, issuer: tokenIssuer, expiresIn: '5m' });

const buildSdxIntegration = async (
  projectName: string,
  attributes: Record<string, any> = {},
): Promise<Omit<Integration, 'sdxServices'> & { id: number; sdxServices?: any }> => {
  const integration = await buildIntegration({ projectName, prodEnv: true, submitted: true });
  const id = integration.body.id!;
  const sdxAttributes = { sdxEnabled: true, clientId: 'test-client', status: 'applied', ...attributes };
  await models.request.update(sdxAttributes, { where: { id } });
  return { ...integration.body, ...sdxAttributes, id } as Omit<Integration, 'sdxServices'> & {
    id: number;
    sdxServices?: any;
  };
};

const withSdxServices = (
  integration: Omit<Integration, 'sdxServices'> & { id: number },
  resourceServers: SDXResourceServer[],
) =>
  ({
    ...integration,
    sdxServices: {
      integrationId: integration.id,
      clientId: '',
      privacyZone: '',
      policyVersion: '',
      resourceServers,
    },
  } as Integration);

beforeAll(() => {
  process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'true';
});

describe('SDX APIs', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'test';
    process.env.SDX_API = SDX_API;
    process.env.SDX_TOKEN_URL = SDX_TOKEN_URL;
    await cleanUpDatabaseTables();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
    (getConfiguration as jest.Mock).mockResolvedValue({ jwks, issuer });
    (getUserById as jest.Mock).mockResolvedValue({
      id: 1,
      displayName: 'Test User',
      idirEmail: TEAM_ADMIN_IDIR_EMAIL_01,
    });
    (getPrivacyZoneURI as jest.Mock).mockResolvedValue('urn:ca:bc:gov:health:prod');
    setUpSdxApi();
    setUpKeycloak();
  });

  describe('List resource servers', () => {
    it('Returns the resource servers of every environment', async () => {
      setUpSdxApi({
        resourceServers: {
          [NON_PRODUCTION_ENV]: [nonProductionResourceServer],
          [PRODUCTION_ENV]: [productionResourceServer],
        },
      });

      const result = await getSdxResourceServers();

      expect(result.status).toBe(200);
      expect(Array.isArray(result.body)).toBe(true);
      expect(result.body).toHaveLength(2);
      expect(result.body.map((resourceServer: SDXResourceServer) => resourceServer.environment)).toEqual([
        PRODUCTION_ENV,
        NON_PRODUCTION_ENV,
      ]);
      expect(result.body[1]).toEqual(
        expect.objectContaining({
          id: 'health-rs',
          organization: 'Ministry of Health',
          environment: NON_PRODUCTION_ENV,
        }),
      );
      expect(result.body[1].services[0]).toEqual(
        expect.objectContaining({
          name: 'patient-api',
          version: 'v1',
          scopes: [scope('patient.read'), scope('patient.write')],
        }),
      );
    });

    it('Requests each environment with a bearer token', async () => {
      await getSdxResourceServers();

      expect(sdxApiCalls('/resource-servers')).toEqual([
        `${SDX_API}/resource-servers?environment=${PRODUCTION_ENV}`,
        `${SDX_API}/resource-servers?environment=${NON_PRODUCTION_ENV}`,
      ]);
      const [, options] = fetchMock.mock.calls.find(([url]) => String(url).includes('/resource-servers'))!;
      expect(options.headers.Authorization).toBe('Bearer sdx-access-token');
    });

    it('Uses the production environment values when the app runs in production', async () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';

      await getSdxResourceServers();

      expect(sdxApiCalls('/resource-servers')).toEqual([
        `${SDX_API}/resource-servers?environment=bc`,
        `${SDX_API}/resource-servers?environment=bct`,
      ]);

      process.env.NEXT_PUBLIC_APP_ENV = 'test';
    });

    it('Rejects unauthenticated requests', async () => {
      clearMockAuth();

      const result = await getSdxResourceServers();

      expect(result.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('Rejects unsupported methods', async () => {
      const result = await postSdxResourceServers();

      expect(result.status).toBe(405);
      expect(result.headers.allow).toContain('GET');
    });

    it('Fails gracefully when the SDX API is unavailable', async () => {
      setUpSdxApi({ failOn: (url) => url.includes('/resource-servers') });

      const result = await getSdxResourceServers();

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Failed to fetch SDX resource servers');
    });

    it('Fails gracefully when the SDX token cannot be fetched', async () => {
      setUpSdxApi({ failOn: (url) => url === SDX_TOKEN_URL });

      const result = await getSdxResourceServers();

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Failed to fetch SDX resource servers');
    });
  });

  describe('Allowed access for a client', () => {
    it('Returns the approved access of every environment for the client', async () => {
      const integration = await buildSdxIntegration('sdx-allowed-access');
      setUpSdxApi({
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [nonProductionResourceServer],
          [`${PRODUCTION_ENV}:approved`]: [productionResourceServer],
        },
      });

      const result = await getSdxAllowedAccess(integration.id, 'approved');

      expect(result.status).toBe(200);
      expect(result.body.clientId).toBe('test-client');
      expect(result.body.resourceServers).toHaveLength(2);
      expect(result.body.resourceServers.map((resourceServer: SDXResourceServer) => resourceServer.id)).toEqual([
        'finance-rs',
        'health-rs',
      ]);
    });

    it('Defaults to the approved status and forwards the requested status', async () => {
      const integration = await buildSdxIntegration('sdx-allowed-access-status');

      await getSdxAllowedAccess(integration.id);
      expect(
        sdxApiCalls(`/integrations/${integration.id}/allowed-services`).every((url) => url.includes('status=approved')),
      ).toBe(true);

      fetchMock.mockClear();

      await getSdxAllowedAccess(integration.id, 'pending');
      expect(sdxApiCalls(`/integrations/${integration.id}/allowed-services`)).toEqual([
        `${SDX_API}/integrations/${integration.id}/allowed-services?environment=${PRODUCTION_ENV}&status=pending`,
        `${SDX_API}/integrations/${integration.id}/allowed-services?environment=${NON_PRODUCTION_ENV}&status=pending`,
      ]);
    });

    it('Rejects requests without an integration id', async () => {
      const result = await getSdxAllowedAccessWithoutId();

      expect(result.status).toBe(400);
      expect(result.body.message).toBe('Integration ID is required');
    });

    it('Rejects unauthenticated requests', async () => {
      const integration = await buildSdxIntegration('sdx-allowed-access-unauthenticated');
      clearMockAuth();

      const result = await getSdxAllowedAccess(integration.id);

      expect(result.status).toBe(401);
    });

    it('Fails when the integration does not exist', async () => {
      const result = await getSdxAllowedAccess(999999);

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Request not found');
    });

    it('Fails gracefully when the SDX API is unavailable', async () => {
      const integration = await buildSdxIntegration('sdx-allowed-access-failure');
      setUpSdxApi({ failOn: (url) => url.includes('/allowed-services') });

      const result = await getSdxAllowedAccess(integration.id);

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Failed to fetch SDX services');
    });

    it('Rejects unsupported methods', async () => {
      const integration = await buildSdxIntegration('sdx-allowed-access-method');

      const result = await deleteSdxAllowedAccess(integration.id);

      expect(result.status).toBe(405);
      expect(result.headers.allow).toContain('GET');
      expect(result.headers.allow).toContain('PUT');
    });
  });

  describe('Creating an SDX access request', () => {
    it('Stores the submission in the sdx_requests table', async () => {
      const integration = await buildSdxIntegration('sdx-create-request');
      const resourceServers = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      setUpSdxApi({ accessRequestBody: { submissionId: 'submission-123' } });

      const result = await createSdxRequest(adminSession, withSdxServices(integration, resourceServers));

      expect(result.success).toBe(true);

      const stored: any = await models.SdxRequest.findOne({ where: { request_id: integration.id } });
      expect(stored).not.toBeNull();
      expect(stored.submission_id).toBe('submission-123');
      expect(stored.access_request.resourceServers[0].services[0].scopes).toEqual(['patient.read']);
      expect(stored.access_request).toEqual(
        expect.objectContaining({
          clientId: 'test-client',
          policyVersion: 'SDX.R1.00',
          privacyZone: 'urn:ca:bc:gov:health:prod',
          requester: expect.objectContaining({
            displayName: 'Test User',
            email: TEAM_ADMIN_IDIR_EMAIL_01,
          }),
        }),
      );
    });

    it('Posts the access request payload to the SDX API', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-payload');
      const sdxRequestData = {
        integrationId: integration.id,
        clientId: 'test-client',
        resourceServers: [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])],
      };

      await createSdxRequest(adminSession, withSdxServices(integration, sdxRequestData.resourceServers));

      const [, options] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'))!;
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer sdx-access-token');
      expect(JSON.parse(options.body)).toEqual({
        ...sdxRequestData,
        requester: {
          displayName: 'Test User',
          email: TEAM_ADMIN_IDIR_EMAIL_01,
        },
        policyVersion: 'SDX.R1.00',
        privacyZone: 'urn:ca:bc:gov:health:prod',
      });
      expect(getPrivacyZoneURI).toHaveBeenCalledWith('prod', '');
    });

    it('Removes the previously approved scopes that are no longer requested', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-removal');
      setUpSdxApi({
        subsystemStatus: 'not-registered',
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [
            selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write']),
          ],
        },
      });
      setUpKeycloak({ existingDefaultClientScopes: ['patient.read', 'patient.write'] });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      expect(keycloak.delDefaultClientScope).toHaveBeenCalledTimes(2);
      expect(keycloak.delDefaultClientScope).toHaveBeenCalledWith({
        id: 'kc-client-uuid',
        realm: 'standard',
        clientScopeId: 'patient.write',
      });
      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['dev', 'test']));
    });

    it('Does not remove scopes that are still requested', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-no-removal');
      setUpSdxApi({
        subsystemStatus: 'not-registered',
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])],
        },
      });
      setUpKeycloak({ existingDefaultClientScopes: ['patient.read'] });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write'])]),
      );

      expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
    });

    it('Creates the keycloak client scopes that do not exist yet', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-scopes');
      setUpKeycloak({ existingClientScopes: ['patient.read'] });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write'])]),
      );
      const createdScopes = keycloak.clientScopesCreate.mock.calls.map(([args]) => args.name);
      expect(createdScopes).toEqual(['patient.write', 'patient.write']);
      expect(createdScopes).not.toContain('patient.read');
      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['dev', 'test']));
      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ realm: 'standard', name: 'patient.write', protocol: 'openid-connect' }),
      );
    });

    it('Fails and stores nothing when the SDX API rejects the request', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-rejected');
      setUpSdxApi({ accessRequestOk: false, accessRequestBody: { message: 'invalid payload' } });

      await expect(
        createSdxRequest(
          adminSession,
          withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
        ),
      ).rejects.toThrow('Failed to create SDX request');

      const stored = await models.SdxRequest.findOne({ where: { request_id: integration.id } });
      expect(stored).toBeNull();
    });

    it('Rejects an access request without resource servers', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-empty');

      await expect(createSdxRequest(adminSession, withSdxServices(integration, []))).rejects.toThrow(
        'SDX resource servers cannot be empty',
      );

      expect(getAdminClient).not.toHaveBeenCalled();
    });

    it('Rejects an access request without SDX services', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-missing-services');

      await expect(createSdxRequest(adminSession, integration)).rejects.toThrow('SDX services cannot be empty');

      expect(fetchMock).not.toHaveBeenCalled();
      expect(getAdminClient).not.toHaveBeenCalled();
    });

    it('Initializes object-form scopes by label', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-object-scopes');

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [
          selectedResourceServer(NON_PRODUCTION_ENV, [] as string[], {
            services: [{ name: 'patient-api', version: 'v1', scopes: [scope('patient.read')] }],
          }),
        ]),
      );

      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'patient.read', protocol: 'openid-connect' }),
      );
    });

    it('Initializes raw SDX production scopes in the production Keycloak environment', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-production-scopes');

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(PRODUCTION_ENV, ['payment.read'])]),
      );

      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['prod']));
      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'payment.read', protocol: 'openid-connect' }),
      );
    });
  });

  describe('getRemovedScopes', () => {
    const existing = [
      {
        id: 'health-rs',
        environment: NON_PRODUCTION_ENV,
        services: [
          { name: 'patient-api', version: 'v1', scopes: ['patient.read', 'patient.write'] },
          { name: 'patient-api', version: 'v2', scopes: ['patient.v2.read'] },
        ],
      },
      {
        id: 'finance-rs',
        environment: PRODUCTION_ENV,
        services: [{ name: 'payment-api', version: 'v1', scopes: ['payment.read'] }],
      },
    ] as unknown as SDXResourceServer[];

    it('Returns nothing when the access is unchanged', () => {
      expect(getRemovedScopes(existing, existing)).toEqual({});
    });

    it('Detects a removed scope, version, service and resource server per environment', () => {
      const removed = getRemovedScopes(existing, [
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
        },
      ] as unknown as SDXResourceServer[]);

      expect(removed[NON_PRODUCTION_ENV].sort()).toEqual(['patient.v2.read', 'patient.write']);
      expect(removed[PRODUCTION_ENV]).toEqual(['payment.read']);
    });

    it('Returns every existing scope when the access is cleared', () => {
      expect(getRemovedScopes(existing, [])).toEqual({
        [NON_PRODUCTION_ENV]: ['patient.read', 'patient.write', 'patient.v2.read'],
        [PRODUCTION_ENV]: ['payment.read'],
      });
    });

    it('Returns nothing when there was no previous access', () => {
      expect(getRemovedScopes([], existing)).toEqual({});
      expect(getRemovedScopes(undefined, undefined)).toEqual({});
    });
  });

  describe('Processing SDX access request approvals', () => {
    const approvalPayload = (environment: string, scopes: string[]) => ({
      integrationId: 1,
      resourceServers: [selectedResourceServer(environment, scopes)],
    });

    it('Rejects a request without an authorization header', async () => {
      const integration = await buildSdxIntegration('sdx-approval-no-header');

      const result = await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']));

      expect(result.status).toBe(401);
      expect(getAdminClient).not.toHaveBeenCalled();
    });

    it('Rejects a request without a bearer token', async () => {
      const integration = await buildSdxIntegration('sdx-approval-no-token');

      const result = await putSdxAllowedAccessWithRawAuthorization(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        'Bearer',
      );

      expect(result.status).toBe(401);
    });

    it('Rejects a malformed token', async () => {
      const integration = await buildSdxIntegration('sdx-approval-malformed-token');

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        'not-a-jwt',
      );

      expect(result.status).toBe(401);
    });

    it('Rejects a token signed with an unknown key id', async () => {
      const integration = await buildSdxIntegration('sdx-approval-unknown-kid');

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken({ keyid: 'unknown-kid' }),
      );

      expect(result.status).toBe(401);
    });

    it('Rejects a token signed by another key', async () => {
      const integration = await buildSdxIntegration('sdx-approval-wrong-signature');
      const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken({ key: otherKeys.privateKey }),
      );

      expect(result.status).toBe(401);
    });

    it('Rejects a token issued by another issuer', async () => {
      const integration = await buildSdxIntegration('sdx-approval-wrong-issuer');

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken({ tokenIssuer: 'https://attacker.example.com' }),
      );

      expect(result.status).toBe(401);
    });

    it('Records the approval event and grants the scopes for a valid token', async () => {
      const integration = await buildSdxIntegration('sdx-approval-success');
      const payload = approvalPayload(NON_PRODUCTION_ENV, ['patient.read', 'patient.write']);

      const result = await putSdxAllowedAccess(integration.id, payload, signToken());
      expect(result.status).toBe(200);
      expect(result.body.success).toBe(true);

      const event: any = await models.event.findOne({
        where: { requestId: integration.id, eventCode: 'sdx-access-request-update' },
      });
      expect(event).not.toBeNull();
      expect(event.details.resourceServers[0].services[0].scopes).toEqual(['patient.read', 'patient.write']);

      expect(keycloak.addDefaultClientScope.mock.calls.map(([args]) => args.clientScopeId).sort()).toEqual([
        'patient.read',
        'patient.read',
        'patient.write',
        'patient.write',
      ]);
    });

    it('Records the event before calling keycloak', async () => {
      const integration = await buildSdxIntegration('sdx-approval-order');

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());
      const event: any = await models.event.findOne({
        where: { requestId: integration.id, eventCode: 'sdx-access-request-update' },
      });
      const firstKeycloakCallAt = (keycloak.addDefaultClientScope.mock.invocationCallOrder[0] ?? 0) > 0;

      expect(event).not.toBeNull();
      expect(firstKeycloakCallAt).toBe(true);
      // Scopes are only added after the client has been looked up.
      expect(keycloak.clientsFind.mock.invocationCallOrder[0]).toBeLessThan(
        keycloak.addDefaultClientScope.mock.invocationCallOrder[0],
      );
      expect(keycloak.listDefaultClientScopes.mock.invocationCallOrder[0]).toBeLessThan(
        keycloak.addDefaultClientScope.mock.invocationCallOrder[0],
      );
    });

    it('Grants SDX production scopes in the production environment only', async () => {
      const integration = await buildSdxIntegration('sdx-approval-production');

      await putSdxAllowedAccess(integration.id, approvalPayload(PRODUCTION_ENV, ['payment.read']), signToken());

      expect(adminClientEnvironments()).toEqual(['prod']);
      expect(keycloak.addDefaultClientScope).toHaveBeenCalledWith({
        id: 'kc-client-uuid',
        realm: 'standard',
        clientScopeId: 'payment.read',
      });
    });

    it('Grants non-production scopes in the dev and test environments', async () => {
      const integration = await buildSdxIntegration('sdx-approval-non-production');

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());
      expect(adminClientEnvironments()).toEqual(['dev', 'test']);
    });

    it('Does not grant a scope that is already assigned to the client', async () => {
      const integration = await buildSdxIntegration('sdx-approval-existing-scope');
      setUpKeycloak({ existingDefaultClientScopes: ['patient.read'] });

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());
      expect(keycloak.addDefaultClientScope).not.toHaveBeenCalled();
    });

    it('Fails when the integration does not exist', async () => {
      const result = await putSdxAllowedAccess(
        999999,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken(),
      );

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Integration with ID 999999 not found');
    });

    it('Fails when SDX is not enabled for the integration', async () => {
      const integration = await buildSdxIntegration('sdx-approval-disabled', { sdxEnabled: false });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken(),
      );

      expect(result.status).toBe(422);
      expect(result.body.message).toBe(`SDX is not enabled for integration with ID ${integration.id}`);
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-access-request-update' } }),
      ).toBeNull();
    });

    it('Fails when the integration is not applied yet', async () => {
      const integration = await buildSdxIntegration('sdx-approval-not-applied', { status: 'submitted' });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken(),
      );

      expect(result.status).toBe(422);
      expect(result.body.message).toBe(`Integration with ID ${integration.id} is not in applied state`);
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-access-request-update' } }),
      ).toBeNull();
    });

    it('Fails when the keycloak client cannot be found', async () => {
      const integration = await buildSdxIntegration('sdx-approval-missing-client');
      setUpKeycloak({ clients: [] });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(PRODUCTION_ENV, ['payment.read']),
        signToken(),
      );

      expect(result.status).toBe(422);
      expect(result.body.message).toBe('Client with ID test-client not found');
    });

    it('Accepts an approval without any resource server', async () => {
      const integration = await buildSdxIntegration('sdx-approval-empty');

      const result = await putSdxAllowedAccess(integration.id, { resourceServers: [] } as any, signToken());

      expect(result.status).toBe(200);
      expect(getAdminClient).not.toHaveBeenCalled();
    });
  });
});
