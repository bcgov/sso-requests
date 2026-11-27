import { generateKeyPairSync, randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import { QueryTypes } from 'sequelize';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { getConfiguration } from '@app/utils/authenticate';
import { getAdminClient } from '@app/keycloak/adminClient';
import { getUserById } from '@app/queries/user';
import { getPrivacyZoneURI } from '@app/utils/bcsc-client';
import * as sdxServices from '@app/controllers/sdx-services';
import { getRemovedScopes, getSdxSubsystemStatus } from '@app/controllers/sdx-services';
import { systemActor, userActor, withActor } from '@sso/audit/server';
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
import { SDX_ENVIRONMENTS } from '@app/utils/constants';
import {
  deleteIntegration,
  getWorkflowForRequest,
  getWorkflowSteps,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { runWorkflow } from '@app/workflow/orchestrator';
import { enqueueRequestWorkflow } from '@app/workflow/request-workflow';
import * as workflowEffects from '@app/workflow/effects';
import { keycloakClient } from '@app/keycloak/integration';
import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import resubmitHandler from '@app/pages/api/requests/[id]/resubmit';
import * as graphApi from '@app/utils/graph-api';
import { INTEGRATION_BUSY_MESSAGE } from '@app/helpers/transitions';

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
const NON_PRODUCTION_ENV = SDX_ENVIRONMENTS['sandbox']['non-production'];
const PRODUCTION_ENV = SDX_ENVIRONMENTS['sandbox']['production'];

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

// What the SDX API offers unless a test sets its own catalog; access requests are checked against it.
const defaultCatalog: Record<string, SDXResourceServer[]> = {
  [NON_PRODUCTION_ENV]: [nonProductionResourceServer],
  [PRODUCTION_ENV]: [productionResourceServer],
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
      return jsonResponse(options.resourceServers?.[environment] ?? defaultCatalog[environment] ?? []);
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
  listOptionalClientScopes: jest.fn(),
  delOptionalClientScope: jest.fn(),
  clientScopesFind: jest.fn(),
  clientScopesCreate: jest.fn(),
  clientScopesFindOneByName: jest.fn(),
  findProtocolMapperByName: jest.fn(),
  addProtocolMapper: jest.fn(),
  addOptionalClientScope: jest.fn(),
};

const setUpKeycloak = ({
  existingClientScopes = [] as string[],
  existingDefaultClientScopes = [] as string[],
  existingOptionalClientScopes = [] as string[],
  existingAudienceMapper = false,
  clients = [{ id: 'kc-client-uuid', clientId: 'test-client' }],
  kongClients = [{ id: 'kong-client-uuid', clientId: 'sdx-rg-pzgw' }],
} = {}) => {
  // The Kong gateway client is looked up separately from the integration's own client.
  keycloak.clientsFind.mockImplementation(async ({ clientId }: { clientId?: string }) =>
    clientId === 'sdx-rg-pzgw' ? kongClients : clients,
  );
  keycloak.listDefaultClientScopes.mockResolvedValue(existingDefaultClientScopes.map((name) => ({ name, id: name })));
  keycloak.addDefaultClientScope.mockResolvedValue(undefined);
  keycloak.delDefaultClientScope.mockResolvedValue(undefined);
  keycloak.listOptionalClientScopes.mockResolvedValue(existingOptionalClientScopes.map((name) => ({ name, id: name })));
  keycloak.delOptionalClientScope.mockResolvedValue(undefined);
  // Keycloak scope ids differ from names in reality, but the name is a stable stand-in here.
  keycloak.clientScopesFind.mockResolvedValue(existingClientScopes.map((name) => ({ name, id: name })));
  keycloak.clientScopesCreate.mockImplementation(async ({ name }: { name: string }) => ({ id: name, name }));
  keycloak.clientScopesFindOneByName.mockResolvedValue({ id: 'scope-id' });
  keycloak.findProtocolMapperByName.mockResolvedValue(existingAudienceMapper ? { name: 'sdx_rg_pzgw_aud' } : null);
  keycloak.addProtocolMapper.mockResolvedValue(undefined);
  keycloak.addOptionalClientScope.mockResolvedValue(undefined);

  (getAdminClient as jest.Mock).mockImplementation(async ({ environment }: { environment: string }) => ({
    environment,
    kcAdminClient: {
      clients: {
        find: keycloak.clientsFind,
        listDefaultClientScopes: keycloak.listDefaultClientScopes,
        addDefaultClientScope: keycloak.addDefaultClientScope,
        delDefaultClientScope: keycloak.delDefaultClientScope,
        listOptionalClientScopes: keycloak.listOptionalClientScopes,
        delOptionalClientScope: keycloak.delOptionalClientScope,
        addOptionalClientScope: keycloak.addOptionalClientScope,
      },
      clientScopes: {
        find: keycloak.clientScopesFind,
        create: keycloak.clientScopesCreate,
        findOneByName: keycloak.clientScopesFindOneByName,
        findProtocolMapperByName: keycloak.findProtocolMapperByName,
        addProtocolMapper: keycloak.addProtocolMapper,
      },
    },
  }));
};

const adminClientEnvironments = () => (getAdminClient as jest.Mock).mock.calls.map(([args]) => args.environment).sort();

// Called directly rather than through their routes, so each runs under the actor its route would set.
const createSdxRequest = (session: Session, integration: Integration, options?: { revokeAll?: boolean }) =>
  withActor(userActor(session.idir_userid!, 'Test User'), () =>
    sdxServices.createSdxRequest(session, integration, options),
  );
const processSdxWorkflowUpdates = (...args: Parameters<typeof sdxServices.processSdxWorkflowUpdates>) =>
  withActor(systemActor('sdx-callback'), () => sdxServices.processSdxWorkflowUpdates(...args));

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

const waitForBlockedTransaction = async (pid: number) => {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    const [result] = await sequelize.query<{ blocked: boolean }>(
      'SELECT EXISTS (SELECT 1 FROM pg_stat_activity WHERE :pid = ANY(pg_blocking_pids(pid))) AS blocked',
      { replacements: { pid }, type: QueryTypes.SELECT },
    );
    if (result.blocked) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error('Deletion did not wait for the integration lock');
};

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

      try {
        await getSdxResourceServers();

        expect(sdxApiCalls('/resource-servers')).toEqual([
          `${SDX_API}/resource-servers?environment=bc`,
          `${SDX_API}/resource-servers?environment=bct`,
        ]);
      } finally {
        // Always restore, otherwise a failed assertion above would leak into every later test.
        process.env.NEXT_PUBLIC_APP_ENV = 'test';
      }
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
    it('rejects invalid SDX selections before saving or running the integration workflow', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-invalid');
      const previousWorkflow = await getWorkflowForRequest(integration.id);
      const eventCount = await models.event.count({ where: { requestId: integration.id } });
      (keycloakClient as jest.Mock).mockClear();
      fetchMock.mockClear();

      const response = await updateIntegration(
        {
          ...withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['unknown.scope'])]),
          projectName: 'unsaved-invalid-update',
        },
        true,
      );
      expect(response.status).toBe(422);
      expect(response.body.message).toContain('SDX scopes not offered by SDX');
      expect((await getWorkflowForRequest(integration.id)).id).toBe(previousWorkflow.id);
      expect((await models.request.findByPk(integration.id)).status).toBe('applied');
      expect((await models.request.findByPk(integration.id)).projectName).toBe(integration.projectName);
      expect(await models.event.count({ where: { requestId: integration.id } })).toBe(eventCount);
      expect(keycloakClient).not.toHaveBeenCalled();
      expect(sdxApiCalls('/access-requests')).toHaveLength(0);
    });

    it('rejects the update without starting a workflow when the SDX catalog is unavailable', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-catalog-unavailable');
      const previousWorkflow = await getWorkflowForRequest(integration.id);
      setUpSdxApi({ failOn: (url) => url.includes('/resource-servers') });
      (keycloakClient as jest.Mock).mockClear();
      fetchMock.mockClear();

      const response = await updateIntegration(
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
        true,
      );
      expect(response.status).toBe(422);
      expect(response.body.message).toBe('Failed to fetch SDX resource servers');
      expect((await getWorkflowForRequest(integration.id)).id).toBe(previousWorkflow.id);
      expect((await models.request.findByPk(integration.id)).status).toBe('applied');
      expect(keycloakClient).not.toHaveBeenCalled();
      expect(sdxApiCalls('/access-requests')).toHaveLength(0);
    });

    it('persists and submits the validated selection without rechecking the catalog', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-submit');
      const selection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'], { name: 'Untrusted name' })];
      const validated = [
        {
          id: 'health-rs',
          name: 'Health Resource Server',
          organization: 'Ministry of Health',
          description: 'Health data services',
          environment: NON_PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
        },
      ];
      process.env.WORKFLOW_EXECUTION_MODE = 'manual';
      try {
        const response = await updateIntegration(withSdxServices(integration, selection), true);
        expect(response.status).toBe(200);
        const workflow = await getWorkflowForRequest(integration.id);
        expect(workflow.context.sdx.resourceServers).toEqual(validated);
        expect((await getWorkflowSteps(workflow.id)).map((step: any) => step.name)).toContain('SDX_SUBMIT');
        expect(sdxApiCalls('/access-requests')).toHaveLength(0);

        setUpSdxApi({ failOn: (url) => url.includes('/resource-servers') });
        fetchMock.mockClear();
        await runWorkflow(workflow.id);
        expect(sdxApiCalls('/access-requests')).toHaveLength(1);
        expect(sdxApiCalls('/resource-servers')).toHaveLength(0);
        const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
        expect(JSON.parse(call![1].body).resourceServers).toEqual(validated);
        expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
      } finally {
        process.env.WORKFLOW_EXECUTION_MODE = 'synchronous';
      }
    });

    it('revokes SDX after deleting the Keycloak clients', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-delete');
      (keycloakClient as jest.Mock).mockClear();
      fetchMock.mockClear();

      expect((await deleteIntegration(integration.id)).status).toBe(200);
      const workflow = await getWorkflowForRequest(integration.id);
      const steps = await getWorkflowSteps(workflow.id);
      expect(steps.map((step: any) => step.name)).toEqual([
        'PLAN',
        'APPLY_DEV',
        'APPLY_TEST',
        'APPLY_PROD',
        'SDX_SUBMIT',
        'NOTIFY',
        'FINALIZE',
      ]);
      const callIndex = fetchMock.mock.calls.findIndex(([url]) => String(url).endsWith('/access-requests'));
      expect(callIndex).toBeGreaterThanOrEqual(0);
      expect(JSON.parse(fetchMock.mock.calls[callIndex][1].body).resourceServers).toEqual([]);
      expect(Math.max(...(keycloakClient as jest.Mock).mock.invocationCallOrder)).toBeLessThan(
        fetchMock.mock.invocationCallOrder[callIndex],
      );
      expect(workflow.state).toBe('COMPLETED');
    });

    it('locks the integration before its workflow and deletes the latest committed state', async () => {
      const integration = await buildSdxIntegration('sdx-delete-lock-order');
      const previous = await getWorkflowForRequest(integration.id);
      const transaction = await sequelize.transaction();
      let committed = false;
      let deletion: ReturnType<typeof deleteIntegration> | undefined;
      try {
        await models.request.update(
          { projectName: 'updated before deletion' },
          { where: { id: integration.id }, transaction },
        );
        const [backend] = await sequelize.query<{ pid: number }>('SELECT pg_backend_pid() AS pid', {
          transaction,
          type: QueryTypes.SELECT,
        });
        deletion = deleteIntegration(integration.id);

        await waitForBlockedTransaction(backend.pid);

        await sequelize.query('SELECT id FROM request_workflows WHERE id = :id FOR UPDATE NOWAIT', {
          replacements: { id: previous.id },
          transaction,
        });
        await transaction.commit();
        committed = true;

        const response = await deletion;
        expect(response.status).toBe(200);
        expect(response.body.projectName).toBe('updated before deletion');
        expect((await getWorkflowForRequest(integration.id)).payload.projectName).toBe('updated before deletion');
      } finally {
        if (!committed) await transaction.rollback();
        if (deletion) await deletion;
      }
    }, 15000);

    it('rechecks deletion against the status committed while waiting for the lock', async () => {
      const integration = await buildSdxIntegration('sdx-delete-lock-transition');
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const transaction = await sequelize.transaction();
      let committed = false;
      let deletion: ReturnType<typeof deleteIntegration> | undefined;
      try {
        await models.request.update({ status: 'planned' }, { where: { id: integration.id }, transaction });
        const [backend] = await sequelize.query<{ pid: number }>('SELECT pg_backend_pid() AS pid', {
          transaction,
          type: QueryTypes.SELECT,
        });
        deletion = deleteIntegration(integration.id);
        await waitForBlockedTransaction(backend.pid);
        await transaction.commit();
        committed = true;

        const response = await deletion;
        expect(response.status).toBe(422);
        expect(response.body.message).toBe(INTEGRATION_BUSY_MESSAGE);
        expect((await models.request.findByPk(integration.id)).archived).toBe(false);
      } finally {
        if (!committed) await transaction.rollback();
        if (deletion) await deletion;
      }
    }, 15000);

    it('blocks deletion requiring revocation when the SDX feature is disabled', async () => {
      const integration = await buildSdxIntegration('sdx-delete-disabled-flag');
      const before = await getWorkflowForRequest(integration.id);
      process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'false';
      fetchMock.mockClear();
      try {
        const response = await deleteIntegration(integration.id);
        expect(response.status).toBe(422);
        expect(response.body.message).toMatch(/SDX must be enabled/);
        expect((await models.request.findByPk(integration.id)).archived).toBe(false);
        expect((await getWorkflowForRequest(integration.id)).id).toBe(before.id);
        expect(sdxApiCalls('/access-requests')).toHaveLength(0);
      } finally {
        process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'true';
      }
    });

    it('does not repeat an accepted revoke on deletion, even when the feature is disabled', async () => {
      const integration = await buildSdxIntegration('sdx-delete-after-revoke');
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );
      process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'false';
      fetchMock.mockClear();
      try {
        expect((await deleteIntegration(integration.id)).status).toBe(200);
        expect(sdxApiCalls('/access-requests')).toHaveLength(0);
        expect(
          (await getWorkflowSteps((await getWorkflowForRequest(integration.id)).id)).map((s: any) => s.name),
        ).not.toContain('SDX_SUBMIT');
      } finally {
        process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'true';
      }
    });

    it('revokes again if SDX access was submitted after an accepted revoke', async () => {
      const integration = await buildSdxIntegration('sdx-delete-after-new-access');
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );
      const selection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      expect((await updateIntegration(withSdxServices(integration, selection), true)).status).toBe(200);
      fetchMock.mockClear();
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
      expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
    });

    it('revokes if a later access workflow failed before it could submit', async () => {
      const integration = await buildSdxIntegration('sdx-delete-after-failed-access');
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );
      (keycloakClient as jest.Mock).mockResolvedValueOnce(false);
      const selection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      expect((await updateIntegration(withSdxServices(integration, selection), true)).status).toBe(200);
      const failed = await getWorkflowForRequest(integration.id);
      expect(failed.state).toBe('FAILED');
      // A queued workflow can be created before the previous revoke is accepted, then fail afterward.
      const acceptedAt = new Date(Date.now() + 3000);
      await models.SdxRequest.update(
        { createdAt: acceptedAt },
        { where: { request_id: integration.id }, silent: true },
      );
      await sequelize.query('UPDATE request_workflows SET updated_at = :updatedAt WHERE id = :id', {
        replacements: { id: failed.id, updatedAt: new Date(acceptedAt.getTime() + 1000) },
      });
      fetchMock.mockClear();
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
      expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
    });

    it('does not resubmit an archived integration after a deletion workflow fails', async () => {
      const integration = await buildSdxIntegration('sdx-delete-retry');
      setUpSdxApi({ accessRequestOk: false });
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      const failed = await getWorkflowForRequest(integration.id);
      expect(failed.state).toBe('FAILED');
      expect((await models.request.findByPk(integration.id)).archived).toBe(true);
      expect(
        (await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`)).status,
      ).toBe(422);
      expect((await getWorkflowForRequest(integration.id)).id).toBe(failed.id);
    });

    it('retries a failed SDX submission when an integration is resubmitted', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-resubmit');
      const selection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      setUpSdxApi({ accessRequestOk: false });
      expect((await updateIntegration(withSdxServices(integration, selection), true)).status).toBe(200);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('FAILED');

      setUpSdxApi({ failOn: (url) => url.includes('/resource-servers') });
      fetchMock.mockClear();
      const response = await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`);
      expect(response.status).toBe(200);
      const workflow = await getWorkflowForRequest(integration.id);
      expect(workflow.state).toBe('COMPLETED');
      expect(workflow.context.sdx.resourceServers[0].services[0].scopes).toEqual(['patient.read']);
      expect(sdxApiCalls('/resource-servers')).toHaveLength(0);
      expect((await getWorkflowSteps(workflow.id)).find((step: any) => step.name === 'SDX_SUBMIT').state).toBe(
        'COMPLETED',
      );
    });

    it('refuses an update or resubmit while an SDX workflow is running and submits only its selection', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-busy');
      const workflowsBefore = await models.requestWorkflow.count({ where: { requestId: integration.id } });
      const runningSelection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.write'])];
      const refusedSelection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      process.env.WORKFLOW_EXECUTION_MODE = 'manual';
      try {
        const running = await enqueueRequestWorkflow(integration, {
          sdx: {
            requesterId: 1,
            request: { id: integration.id, clientId: integration.clientId, status: 'applied' },
            revokeAll: false,
            resourceServers: runningSelection,
          },
        });

        const update = await updateIntegration(withSdxServices(integration, refusedSelection), true);
        expect(update.status).toBe(422);
        expect(update.body.message).toBe(INTEGRATION_BUSY_MESSAGE);
        await models.request.update({ status: 'planned' }, { where: { id: integration.id } });
        const resubmit = await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`);
        expect(resubmit.status).toBe(422);
        expect(resubmit.body.message).toBe(INTEGRATION_BUSY_MESSAGE);
        expect(await models.requestWorkflow.count({ where: { requestId: integration.id } })).toBe(workflowsBefore + 1);

        fetchMock.mockClear();
        await runWorkflow(running.workflowId);
        const submissions = fetchMock.mock.calls
          .filter(([url]) => String(url).endsWith('/access-requests'))
          .map(([, options]) => JSON.parse(options.body).resourceServers[0].services[0].scopes);
        expect(submissions).toEqual([['patient.write']]);
        expect((await models.requestWorkflow.findByPk(running.workflowId)).state).toBe('COMPLETED');
      } finally {
        process.env.WORKFLOW_EXECUTION_MODE = 'synchronous';
      }
    });

    it('removes previously approved scopes after an integration workflow has failed', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-reconcile-after-failure');
      const approved = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write'])];
      setUpSdxApi({ allowedServices: { [`${NON_PRODUCTION_ENV}:approved`]: approved } });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write'],
        existingOptionalClientScopes: ['patient.read', 'patient.write'],
      });
      await createSdxRequest(adminSession, withSdxServices(integration, approved));
      await models.request.update({ status: 'applyFailed' }, { where: { id: integration.id } });
      keycloak.delOptionalClientScope.mockClear();

      const response = await updateIntegration(
        withSdxServices({ ...integration, status: 'applyFailed' }, [
          selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']),
        ]),
        true,
      );
      expect(response.status).toBe(200);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
      expect(keycloak.delOptionalClientScope.mock.calls.map(([args]) => args.clientScopeId)).toEqual([
        'patient.write',
        'patient.write',
      ]);
    });

    it('reconciles previously approved scopes even without local SDX submission history', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-reconcile-no-history', { status: 'applyFailed' });
      setUpSdxApi({
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [
            selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write']),
          ],
        },
      });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write'],
        existingOptionalClientScopes: ['patient.read', 'patient.write'],
      });

      expect(await models.SdxRequest.count({ where: { request_id: integration.id } })).toBe(0);
      const response = await updateIntegration(
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
        true,
      );
      expect(response.status).toBe(200);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
      expect(keycloak.delOptionalClientScope.mock.calls.map(([args]) => args.clientScopeId)).toEqual([
        'patient.write',
        'patient.write',
      ]);
    });

    it('retries a failed SDX registration check through the workflow', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-status-failure', { status: 'applyFailed' });
      setUpSdxApi({ failOn: (url) => url.endsWith(`/integrations/${integration.id}`) });

      const response = await updateIntegration(
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
        true,
      );
      expect(response.status).toBe(200);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('FAILED');

      setUpSdxApi({ subsystemStatus: 'not-registered' });
      const retry = await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`);
      expect(retry.status).toBe(200);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
    });

    it('revokes previously submitted SDX access even when SDX is now disabled', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-delete-disabled');
      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );
      await models.request.update({ sdxEnabled: false }, { where: { id: integration.id } });
      fetchMock.mockClear();

      expect((await deleteIntegration(integration.id)).status).toBe(200);
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
      expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
    });

    it('sends a revoke-all through the workflow when SDX is disabled', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-disable');
      fetchMock.mockClear();
      const response = await updateIntegration(
        {
          ...integration,
          sdxEnabled: false,
          sdxServices: {
            integrationId: integration.id,
            clientId: integration.clientId || '',
            privacyZone: '',
            policyVersion: '',
            resourceServers: [],
          },
        },
        true,
      );
      expect(response.status).toBe(200);
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
      expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
      expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
    });

    it('keeps the integration in flight and refuses updates until notifications have been sent', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-notify-busy');
      process.env.WORKFLOW_EXECUTION_MODE = 'manual';
      let releaseNotify: () => void = () => {};
      let notifyStarted: () => void = () => {};
      const notifyGate = new Promise<void>((resolve) => {
        releaseNotify = resolve;
      });
      const notificationReached = new Promise<void>((resolve) => {
        notifyStarted = resolve;
      });
      const notify = jest.spyOn(workflowEffects, 'updatePlannedIntegration').mockImplementation(async () => {
        notifyStarted();
        await notifyGate;
      });
      let runningPromise: Promise<unknown> | undefined;
      try {
        const disabled = { ...withSdxServices(integration, []), sdxEnabled: false };
        expect((await updateIntegration(disabled, true)).status).toBe(200);
        const revoke = await getWorkflowForRequest(integration.id);
        expect(revoke.context.sdx.revokeAll).toBe(true);
        const workflowsBefore = await models.requestWorkflow.count({ where: { requestId: integration.id } });

        runningPromise = runWorkflow(revoke.id);
        await notificationReached;
        expect((await models.request.findByPk(integration.id)).status).toBe('planned');
        const edit = { ...integration, sdxEnabled: false, projectName: 'edit-during-notify' };
        const refused = await updateIntegration(edit, true);
        expect(refused.status).toBe(422);
        expect(refused.body.message).toBe(INTEGRATION_BUSY_MESSAGE);

        releaseNotify();
        await runningPromise;
        expect((await models.request.findByPk(integration.id)).status).toBe('applied');
        expect((await models.requestWorkflow.findByPk(revoke.id)).state).toBe('COMPLETED');
        expect(await models.requestWorkflow.count({ where: { requestId: integration.id } })).toBe(workflowsBefore);
        expect((await updateIntegration(edit, true)).status).toBe(200);
        await runWorkflow((await getWorkflowForRequest(integration.id)).id);
      } finally {
        releaseNotify();
        if (runningPromise) await runningPromise;
        notify.mockRestore();
        process.env.WORKFLOW_EXECUTION_MODE = 'synchronous';
      }
    });

    it.each(['environment', 'sdx'])(
      'carries a revoke-all after a failure at %s into a later update while SDX remains disabled',
      async (failure) => {
        const integration = await buildSdxIntegration(`sdx-workflow-failed-revoke-${failure}`);
        if (failure === 'environment') (keycloakClient as jest.Mock).mockResolvedValueOnce(false);
        else setUpSdxApi({ accessRequestOk: false });
        const disabled = { ...withSdxServices(integration, []), sdxEnabled: false };
        expect((await updateIntegration(disabled, true)).status).toBe(200);
        const failed = await getWorkflowForRequest(integration.id);
        expect(failed.state).toBe('FAILED');
        expect((await getWorkflowSteps(failed.id)).find((step: any) => step.name === 'SDX_SUBMIT').state).toBe(
          failure === 'environment' ? 'PENDING' : 'FAILED',
        );

        setUpSdxApi();
        fetchMock.mockClear();
        const edit = { ...integration, sdxEnabled: false, projectName: 'failed-revoke-edit' };
        expect((await updateIntegration(edit, true)).status).toBe(200);
        const workflow = await getWorkflowForRequest(integration.id);
        expect(workflow.context.sdx.revokeAll).toBe(true);
        expect(workflow.state).toBe('COMPLETED');
        const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
        expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
      },
    );

    it('recovers a failed revoke-all when a newer failed workflow has no SDX context', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-recover-revoke');
      (keycloakClient as jest.Mock).mockResolvedValueOnce(false);
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );
      const revoke = await getWorkflowForRequest(integration.id);
      expect(revoke.state).toBe('FAILED');

      process.env.WORKFLOW_EXECUTION_MODE = 'manual';
      try {
        (keycloakClient as jest.Mock).mockResolvedValueOnce(false);
        const newer = await enqueueRequestWorkflow({ ...integration, sdxEnabled: false });
        await runWorkflow(newer.workflowId);
        const newerWorkflow = await models.requestWorkflow.findByPk(newer.workflowId, { raw: true });
        expect(newerWorkflow.state).toBe('FAILED');
        expect(newerWorkflow.context.sdx).toBeUndefined();

        const response = await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`);
        expect(response.status).toBe(200);
        const workflow = await getWorkflowForRequest(integration.id);
        expect(workflow.context.sdx).toEqual(revoke.context.sdx);
        fetchMock.mockClear();
        await runWorkflow(workflow.id);
        const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
        expect(JSON.parse(call![1].body).resourceServers).toEqual([]);
        expect((await getWorkflowForRequest(integration.id)).state).toBe('COMPLETED');
      } finally {
        process.env.WORKFLOW_EXECUTION_MODE = 'synchronous';
      }
    });

    it('does not repeat a completed revoke-all on an unrelated update', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-completed-revoke');
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );
      fetchMock.mockClear();
      expect(
        (await updateIntegration({ ...integration, sdxEnabled: false, projectName: 'after-revoke' }, true)).status,
      ).toBe(200);
      expect(sdxApiCalls('/access-requests')).toHaveLength(0);
      expect((await getWorkflowForRequest(integration.id)).context.sdx).toBeUndefined();
    });

    it('uses a new SDX selection instead of carrying an earlier failed revoke-all', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-reenable-after-failed-revoke');
      (keycloakClient as jest.Mock).mockResolvedValueOnce(false);
      expect((await updateIntegration({ ...withSdxServices(integration, []), sdxEnabled: false }, true)).status).toBe(
        200,
      );

      fetchMock.mockClear();
      const selection = [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])];
      expect((await updateIntegration(withSdxServices(integration, selection), true)).status).toBe(200);
      const workflow = await getWorkflowForRequest(integration.id);
      expect(workflow.context.sdx.revokeAll).toBe(false);
      const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'));
      expect(JSON.parse(call![1].body).resourceServers[0].services[0].scopes).toEqual(['patient.read']);
    });

    it('does not request SDX access again when a deleted integration is restored', async () => {
      const integration = await buildSdxIntegration('sdx-workflow-restore');
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      fetchMock.mockClear();
      const validateEmail = jest
        .spyOn(graphApi, 'validateIdirEmail')
        .mockResolvedValue({ given_name: 'Test', family_name: 'User' });
      try {
        expect((await restoreIntegration(integration.id, TEAM_ADMIN_IDIR_EMAIL_01)).status).toBe(200);
        expect(sdxApiCalls('/access-requests')).toHaveLength(0);
        const workflow = await getWorkflowForRequest(integration.id);
        expect((await getWorkflowSteps(workflow.id)).map((step: any) => step.name)).not.toContain('SDX_SUBMIT');
      } finally {
        validateEmail.mockRestore();
      }
    });

    it('does not contact SDX when deleting an integration with no SDX history', async () => {
      const integration = await buildIntegration({ projectName: 'non-sdx-workflow-delete', submitted: true });
      fetchMock.mockClear();
      process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'false';
      try {
        expect((await deleteIntegration(integration.body.id)).status).toBe(200);
        expect(sdxApiCalls('/access-requests')).toHaveLength(0);
        const workflow = await getWorkflowForRequest(integration.body.id);
        expect((await getWorkflowSteps(workflow.id)).map((step: any) => step.name)).not.toContain('SDX_SUBMIT');
      } finally {
        process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES = 'true';
      }
    });

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
      const requested = {
        ...selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']),
        name: 'Renamed by the client',
        approved: true,
      };

      await createSdxRequest(adminSession, {
        ...withSdxServices(integration, [requested as SDXResourceServer]),
        sdxServices: { resourceServers: [requested], status: 'approved' },
      } as unknown as Integration);

      const [, options] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'))!;
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer sdx-access-token');
      // Rebuilt from the catalog: fields the client added or changed are not forwarded.
      expect(JSON.parse(options.body)).toEqual({
        integrationId: integration.id,
        clientId: 'test-client',
        resourceServers: [
          {
            id: 'health-rs',
            name: 'Health Resource Server',
            organization: 'Ministry of Health',
            description: 'Health data services',
            environment: NON_PRODUCTION_ENV,
            services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
          },
        ],
        requester: {
          displayName: 'Test User',
          email: TEAM_ADMIN_IDIR_EMAIL_01,
        },
        policyVersion: 'SDX.R1.00',
        privacyZone: 'urn:ca:bc:gov:health:prod',
      });
      expect(getPrivacyZoneURI).toHaveBeenCalledWith('prod', '');
    });

    it.each([
      ['a scope the service does not offer', selectedResourceServer(NON_PRODUCTION_ENV, ['patient.delete'])],
      [
        'a service version the catalog does not have',
        selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'], {
          services: [{ name: 'patient-api', version: 'v9', scopes: ['patient.read'] }],
        }),
      ],
      ['a resource server of another environment', selectedResourceServer(PRODUCTION_ENV, ['patient.read'])],
    ])('Rejects %s before anything is sent or recorded', async (_, resourceServer) => {
      const integration = await buildSdxIntegration('sdx-create-request-unknown');

      await expect(
        createSdxRequest(adminSession, withSdxServices(integration, [resourceServer as SDXResourceServer])),
      ).rejects.toMatchObject({ status: 400, message: expect.stringContaining('SDX scopes not offered by SDX') });

      expect(sdxApiCalls('/access-requests')).toHaveLength(0);
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-request-create' } }),
      ).toBeNull();
    });

    it.each([
      [
        'a scope without a label',
        { services: [{ name: 'patient-api', version: 'v1', scopes: [{ label: undefined }] }] },
        'resourceServers[0].services[0].scopes[0]',
      ],
      [
        'a blank scope label',
        { services: [{ name: 'patient-api', version: 'v1', scopes: ['  '] }] },
        'resourceServers[0].services[0].scopes[0]',
      ],
      ['a resource server without an id', { id: undefined }, 'resourceServers[0].id'],
      ['a resource server without an environment', { environment: '' }, 'resourceServers[0].environment'],
      [
        'a service without a name',
        { services: [{ version: 'v1', scopes: ['patient.read'] }] },
        'resourceServers[0].services[0].name',
      ],
      [
        'a service version that is not a string',
        { services: [{ name: 'patient-api', version: 1, scopes: ['patient.read'] }] },
        'resourceServers[0].services[0].version',
      ],
      [
        'a service without a version',
        { services: [{ name: 'patient-api', scopes: ['patient.read'] }] },
        'resourceServers[0].services[0].version',
      ],
      [
        'a blank service version',
        { services: [{ name: 'patient-api', version: ' ', scopes: ['patient.read'] }] },
        'resourceServers[0].services[0].version',
      ],
      [
        'scopes that are not a list',
        { services: [{ name: 'patient-api', version: 'v1', scopes: 'patient.read' }] },
        'resourceServers[0].services[0].scopes',
      ],
      ['services that are not a list', { services: { name: 'patient-api' } }, 'resourceServers[0].services'],
    ])('Rejects %s as a malformed request', async (_, overrides, field) => {
      const integration = await buildSdxIntegration('sdx-create-request-malformed');
      const resourceServer = { ...selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']), ...overrides };

      await expect(
        createSdxRequest(adminSession, withSdxServices(integration, [resourceServer as any])),
      ).rejects.toMatchObject({ status: 400, message: `Invalid SDX access request: ${field}` });

      expect(sdxApiCalls('/resource-servers')).toHaveLength(0);
      expect(sdxApiCalls('/access-requests')).toHaveLength(0);
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-request-create' } }),
      ).toBeNull();
    });

    it('Removes the previously approved scopes that are no longer requested', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-removal');
      setUpSdxApi({
        subsystemStatus: 'registered',
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [
            selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write']),
          ],
        },
      });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write'],
        existingOptionalClientScopes: ['patient.read', 'patient.write'],
      });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      expect(keycloak.delOptionalClientScope).toHaveBeenCalledTimes(2);
      expect(keycloak.delOptionalClientScope).toHaveBeenCalledWith({
        id: 'kc-client-uuid',
        realm: 'standard',
        clientScopeId: 'patient.write',
      });
      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['dev', 'test']));
    });

    it('Sends an empty selection to revoke all access, leaving the Keycloak scopes to the SDX callback', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-revoke-all');
      setUpSdxApi({
        subsystemStatus: 'registered',
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])],
        },
      });
      setUpKeycloak({ existingClientScopes: ['patient.read'], existingOptionalClientScopes: ['patient.read'] });

      await createSdxRequest(
        adminSession,
        { ...integration, sdxEnabled: false, sdxServices: { resourceServers: [] } } as any,
        {
          revokeAll: true,
        },
      );

      const [, options] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'))!;
      expect(JSON.parse(options.body).resourceServers).toEqual([]);
      expect(keycloak.delOptionalClientScope).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-request-create' } }),
      ).not.toBeNull();
    });

    it('Detects a revoke-all only when an applied integration turns SDX off with an empty selection', () => {
      const original = { sdxEnabled: true } as Integration;
      const off = { sdxEnabled: false, status: 'applied', sdxServices: { resourceServers: [] } } as any;

      expect(sdxServices.isSdxRevokeAll(original, off)).toBe(true);
      expect(sdxServices.isSdxRevokeAll({ sdxEnabled: false } as Integration, off)).toBe(false);
      expect(sdxServices.isSdxRevokeAll(original, { ...off, sdxEnabled: true })).toBe(false);
      expect(sdxServices.isSdxRevokeAll(original, { ...off, status: 'draft' })).toBe(false);
      expect(sdxServices.isSdxRevokeAll(original, { ...off, sdxServices: undefined })).toBe(false);
      expect(sdxServices.isSdxRevokeAll(original, { ...off, sdxServices: { resourceServers: [{}] } })).toBe(false);
    });

    it('Does not remove a previously approved scope the client holds as a default scope', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-default-scope');
      setUpSdxApi({
        subsystemStatus: 'registered',
        allowedServices: {
          [`${NON_PRODUCTION_ENV}:approved`]: [
            selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read', 'patient.write']),
          ],
        },
      });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write'],
        existingDefaultClientScopes: ['patient.write'],
        existingOptionalClientScopes: ['patient.read'],
      });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
      expect(keycloak.delOptionalClientScope).not.toHaveBeenCalled();
    });

    it('Does not remove scopes that are still requested', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-no-removal');
      setUpSdxApi({
        subsystemStatus: 'registered',
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

    it('Does not remove an approved scope whose label is still requested under another version', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-version-change');
      const requestedVersion = (version: string) =>
        selectedResourceServer(NON_PRODUCTION_ENV, [], {
          services: [{ name: 'patient-api', version, scopes: ['patient.read'] }],
        });
      setUpSdxApi({
        subsystemStatus: 'registered',
        resourceServers: {
          [NON_PRODUCTION_ENV]: [
            {
              ...nonProductionResourceServer,
              services: [
                { name: 'patient-api', version: 'v1', scopes: [scope('patient.read')] },
                { name: 'patient-api', version: 'v2', scopes: [scope('patient.read')] },
              ],
            },
          ],
        },
        allowedServices: { [`${NON_PRODUCTION_ENV}:approved`]: [requestedVersion('v1')] },
      });
      setUpKeycloak({ existingClientScopes: ['patient.read'], existingOptionalClientScopes: ['patient.read'] });

      await createSdxRequest(adminSession, withSdxServices(integration, [requestedVersion('v2')]));

      expect(keycloak.delOptionalClientScope).not.toHaveBeenCalled();
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
      ).rejects.toThrow('Failed to process request for SDX services');

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

    it('Skips malformed resource servers without services while creating a request', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-malformed-services');
      const resourceServers = [
        { id: 'broken-rs', environment: NON_PRODUCTION_ENV, services: undefined } as any,
        selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']),
      ];

      await expect(createSdxRequest(adminSession, withSdxServices(integration, resourceServers))).resolves.toEqual(
        expect.objectContaining({ success: true }),
      );
      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'patient.read', protocol: 'openid-connect' }),
      );
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
        withSdxServices(integration, [
          selectedResourceServer(PRODUCTION_ENV, ['payment.read'], {
            id: 'finance-rs',
            services: [{ name: 'payment-api', version: 'v1', scopes: ['payment.read'] }],
          }),
        ]),
      );

      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['prod']));
      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'payment.read', protocol: 'openid-connect' }),
      );
    });

    it('Does not add the scope to the Kong gateway client when it cannot be found', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-no-kong-client');
      setUpKeycloak({ kongClients: [] });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      expect(keycloak.clientScopesCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'patient.read' }));
      expect(keycloak.addOptionalClientScope).not.toHaveBeenCalled();
    });

    it('Creates keycloak scopes independently for non-production and production resource servers in one request', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-multi-env');

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [
          selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']),
          selectedResourceServer(PRODUCTION_ENV, ['payment.read'], {
            id: 'finance-rs',
            services: [{ name: 'payment-api', version: 'v1', scopes: ['payment.read'] }],
          }),
        ]),
      );

      expect(adminClientEnvironments()).toEqual(expect.arrayContaining(['dev', 'test', 'prod']));
      const createdScopeNames = keycloak.clientScopesCreate.mock.calls.map(([args]) => args.name);
      expect(createdScopeNames).toEqual(expect.arrayContaining(['patient.read', 'payment.read']));
    });

    it('Defaults the client id when missing from the request', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-no-client-id', { clientId: '' });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      const [, options] = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/access-requests'))!;
      expect(JSON.parse(options.body).clientId).toBe('');
    });

    it('Falls back to an empty submission id when the SDX API omits it', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-no-submission-id');
      setUpSdxApi({ accessRequestBody: {} });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      const stored: any = await models.SdxRequest.findOne({ where: { request_id: integration.id } });
      expect(stored.submission_id).toBe('');
    });

    it.each(['submitted', 'applyFailed'])(
      'skips removal reconciliation for an unregistered first SDX request when the integration is %s',
      async (status) => {
        const integration = await buildSdxIntegration(`sdx-create-request-first-${status}`, { status });
        setUpSdxApi({ subsystemStatus: 'not-registered' });

        await createSdxRequest(
          adminSession,
          withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
        );

        expect(fetchMock.mock.calls.some(([url]) => /\/integrations\/\d+$/.test(String(url)))).toBe(true);
        expect(sdxApiCalls('/allowed-services')).toHaveLength(0);
        expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
      },
    );

    it('Skips removal reconciliation when the SDX subsystem is not registered', async () => {
      const integration = await buildSdxIntegration('sdx-create-request-not-registered');
      setUpSdxApi({ subsystemStatus: 'not-registered' });

      await createSdxRequest(
        adminSession,
        withSdxServices(integration, [selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read'])]),
      );

      expect(sdxApiCalls('/allowed-services')).toHaveLength(0);
      expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
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

    it('Ignores malformed resource servers and services when comparing scopes', () => {
      const malformed = [
        { id: 'broken-rs', environment: NON_PRODUCTION_ENV, services: undefined } as any,
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
        },
      ] as SDXResourceServer[];

      expect(getRemovedScopes(existing, malformed)).toEqual({
        [NON_PRODUCTION_ENV]: ['patient.write', 'patient.v2.read'],
        [PRODUCTION_ENV]: ['payment.read'],
      });
    });

    it('Keeps a label still requested by another version or service in the same environment', () => {
      const previous = [
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [
            { name: 'patient-api', version: 'v1', scopes: ['patient.read'] },
            { name: 'records-api', version: 'v1', scopes: ['shared.read'] },
          ],
        },
        {
          id: 'health-rs',
          environment: PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
        },
      ] as unknown as SDXResourceServer[];
      const next = [
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [
            { name: 'patient-api', version: 'v2', scopes: ['patient.read'] },
            { name: 'other-api', version: 'v1', scopes: ['shared.read'] },
          ],
        },
      ] as unknown as SDXResourceServer[];

      // Only the environment that no longer requests the label loses it.
      expect(getRemovedScopes(previous, next)).toEqual({ [PRODUCTION_ENV]: ['patient.read'] });
    });

    it('Treats scope labels as case-sensitive', () => {
      const lowerCase = [
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['patient.read'] }],
        },
      ] as unknown as SDXResourceServer[];
      const upperCase = [
        {
          id: 'health-rs',
          environment: NON_PRODUCTION_ENV,
          services: [{ name: 'patient-api', version: 'v1', scopes: ['Patient.Read'] }],
        },
      ] as unknown as SDXResourceServer[];

      expect(getRemovedScopes(lowerCase, upperCase)).toEqual({
        [NON_PRODUCTION_ENV]: ['patient.read'],
      });
    });
  });

  describe('Processing SDX workflow updates', () => {
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

    it('Rejects an expired token', async () => {
      const integration = await buildSdxIntegration('sdx-approval-expired-token');
      const expiredToken = jwt.sign({ sub: 'sdx-system' }, signingKeys.privateKey, {
        algorithm: 'RS256',
        keyid: signingKeyId,
        issuer,
        expiresIn: -10,
      });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        expiredToken,
      );

      expect(result.status).toBe(401);
    });

    it('Records the approval event and grants the scopes for a valid token', async () => {
      setUpKeycloak({ existingClientScopes: ['patient.read', 'patient.write'] });
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

      expect(keycloak.addOptionalClientScope.mock.calls.map(([args]) => args.clientScopeId).sort()).toEqual([
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
      const firstKeycloakCallAt = (keycloak.addOptionalClientScope.mock.invocationCallOrder[0] ?? 0) > 0;

      expect(event).not.toBeNull();
      expect(firstKeycloakCallAt).toBe(true);
      // Scopes are only added after the client has been looked up.
      expect(keycloak.clientsFind.mock.invocationCallOrder[0]).toBeLessThan(
        keycloak.addOptionalClientScope.mock.invocationCallOrder[0],
      );
      expect(keycloak.listDefaultClientScopes.mock.invocationCallOrder[0]).toBeLessThan(
        keycloak.addOptionalClientScope.mock.invocationCallOrder[0],
      );
    });

    it('Grants SDX production scopes in the production environment only', async () => {
      setUpKeycloak({ existingClientScopes: ['payment.read'] });
      const integration = await buildSdxIntegration('sdx-approval-production');

      await putSdxAllowedAccess(integration.id, approvalPayload(PRODUCTION_ENV, ['payment.read']), signToken());

      expect(adminClientEnvironments()).toEqual(['prod']);
      expect(keycloak.addOptionalClientScope).toHaveBeenCalledWith({
        id: 'kc-client-uuid',
        realm: 'standard',
        clientScopeId: 'payment.read',
      });
    });

    it('Adds the SDX client as an audience mapper to the existing client scope', async () => {
      setUpKeycloak({ existingClientScopes: ['test-client', 'payment.read'] });
      const integration = await buildSdxIntegration('sdx-approval-audience-mapper');

      await putSdxAllowedAccess(integration.id, approvalPayload(PRODUCTION_ENV, ['payment.read']), signToken());

      expect(keycloak.findProtocolMapperByName).toHaveBeenCalledWith({
        realm: 'standard',
        name: 'sdx_rg_pzgw_aud',
        id: 'test-client',
      });
      expect(keycloak.addProtocolMapper).toHaveBeenCalledWith(
        { realm: 'standard', id: 'test-client' },
        {
          name: 'sdx_rg_pzgw_aud',
          protocol: 'openid-connect',
          protocolMapper: 'oidc-audience-mapper',
          config: {
            'included.client.audience': 'sdx-rg-pzgw',
            'id.token.claim': 'false',
            'lightweight.claim': 'false',
            'access.token.claim': 'true',
            'introspection.token.claim': 'true',
            'userinfo.token.claim': 'false',
          },
        },
      );
    });

    it('Does not add the SDX audience mapper when it already exists', async () => {
      setUpKeycloak({ existingClientScopes: ['test-client', 'payment.read'], existingAudienceMapper: true });
      const integration = await buildSdxIntegration('sdx-approval-existing-audience-mapper');

      await putSdxAllowedAccess(integration.id, approvalPayload(PRODUCTION_ENV, ['payment.read']), signToken());

      expect(keycloak.findProtocolMapperByName).toHaveBeenCalledWith({
        realm: 'standard',
        name: 'sdx_rg_pzgw_aud',
        id: 'test-client',
      });
      expect(keycloak.addProtocolMapper).not.toHaveBeenCalled();
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

    it('Removes a previously granted optional scope that is no longer approved', async () => {
      setUpSdxApi({ resourceServers: { [NON_PRODUCTION_ENV]: [nonProductionResourceServer] } });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write', 'offline_access', 'profile', 'email'],
        existingDefaultClientScopes: ['profile', 'email'],
        existingOptionalClientScopes: ['patient.read', 'patient.write', 'offline_access'],
      });
      const integration = await buildSdxIntegration('sdx-approval-remove-optional-scope');

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());

      // Once each for dev and test; scopes outside the SDX resource servers are left alone.
      expect(keycloak.delOptionalClientScope.mock.calls).toEqual([
        [{ id: 'kc-client-uuid', realm: 'standard', clientScopeId: 'patient.write' }],
        [{ id: 'kc-client-uuid', realm: 'standard', clientScopeId: 'patient.write' }],
      ]);
      expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
      expect(keycloak.addOptionalClientScope).not.toHaveBeenCalledWith(
        expect.objectContaining({ id: 'kc-client-uuid', clientScopeId: 'patient.read' }),
      );
    });

    it('Does not remove an SDX scope the client holds as a default scope', async () => {
      setUpSdxApi({ resourceServers: { [NON_PRODUCTION_ENV]: [nonProductionResourceServer] } });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write'],
        existingDefaultClientScopes: ['patient.write'],
        existingOptionalClientScopes: ['patient.read'],
      });
      const integration = await buildSdxIntegration('sdx-approval-keep-default-scope');

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());

      expect(keycloak.delDefaultClientScope).not.toHaveBeenCalled();
      expect(keycloak.delOptionalClientScope).not.toHaveBeenCalled();
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

    it('acknowledges an authenticated revoke-all callback after integration deletion without touching Keycloak', async () => {
      const integration = await buildSdxIntegration('sdx-approval-archived-revoke');
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      (getAdminClient as jest.Mock).mockClear();

      const result = await putSdxAllowedAccess(integration.id, { resourceServers: [] }, signToken());

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ success: true });
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-access-request-update' } }),
      ).toBeNull();
    });

    it('rejects approval or unauthenticated callbacks for an archived integration', async () => {
      const integration = await buildSdxIntegration('sdx-approval-archived-reject');
      expect((await deleteIntegration(integration.id)).status).toBe(200);
      (getAdminClient as jest.Mock).mockClear();

      const approval = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(NON_PRODUCTION_ENV, ['patient.read']),
        signToken(),
      );
      const unauthenticated = await putSdxAllowedAccess(integration.id, { resourceServers: [] });
      const missingSelection = await putSdxAllowedAccess(integration.id, {}, signToken());
      const missingIntegration = await putSdxAllowedAccess(999999, { resourceServers: [] }, signToken());

      expect(approval.status).toBe(422);
      expect(unauthenticated.status).toBe(401);
      expect(missingSelection.status).toBe(422);
      expect(missingIntegration.status).toBe(422);
      expect(getAdminClient).not.toHaveBeenCalled();
      expect(
        await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-access-request-update' } }),
      ).toBeNull();
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

    it.each(['submitted', 'planned', 'planFailed', 'applyFailed'])(
      'asks SDX to retry an approval while the integration is %s',
      async (status) => {
        const integration = await buildSdxIntegration(`sdx-approval-${status}`, { status });
        const approval = approvalPayload(NON_PRODUCTION_ENV, ['patient.read']);

        const result = await putSdxAllowedAccess(integration.id, approval, signToken());

        expect(result.status).toBe(503);
        expect(result.body.message).toBe(`Integration with ID ${integration.id} is not in applied state`);
        expect(getAdminClient).not.toHaveBeenCalled();
        expect(
          await models.event.findOne({ where: { requestId: integration.id, eventCode: 'sdx-access-request-update' } }),
        ).toBeNull();

        await models.request.update({ status: 'applied' }, { where: { id: integration.id } });
        expect((await putSdxAllowedAccess(integration.id, approval, signToken())).status).toBe(200);
        expect(keycloak.addOptionalClientScope).toHaveBeenCalled();
      },
    );

    it('Does not fail when the keycloak client cannot be found in one of the environments', async () => {
      const integration = await buildSdxIntegration('sdx-approval-missing-client');
      setUpKeycloak({ clients: [] });

      const result = await putSdxAllowedAccess(
        integration.id,
        approvalPayload(PRODUCTION_ENV, ['payment.read']),
        signToken(),
      );

      expect(result.status).toBe(200);
    });

    it('Accepts an approval without resource server data without changing any scope', async () => {
      const integration = await buildSdxIntegration('sdx-approval-empty');

      const result = await putSdxAllowedAccess(integration.id, {} as any, signToken());

      expect(result.status).toBe(200);
      expect(getAdminClient).not.toHaveBeenCalled();
    });

    it.each([
      ['SDX is still enabled', true],
      ['SDX has been turned off', false],
    ])('Removes every SDX optional scope in all environments for an empty selection when %s', async (_, sdxEnabled) => {
      setUpSdxApi({ resourceServers: { [NON_PRODUCTION_ENV]: [nonProductionResourceServer] } });
      setUpKeycloak({
        existingClientScopes: ['patient.read', 'patient.write', 'offline_access'],
        existingOptionalClientScopes: ['patient.read', 'patient.write', 'offline_access'],
      });
      const integration = await buildSdxIntegration(`sdx-approval-revoke-all-${sdxEnabled}`, { sdxEnabled });

      const result = await putSdxAllowedAccess(integration.id, { resourceServers: [] } as any, signToken());

      expect(result.status).toBe(200);
      expect(adminClientEnvironments()).toEqual(['dev', 'prod', 'test']);
      const removed = keycloak.delOptionalClientScope.mock.calls.map(([args]) => args.clientScopeId);
      expect(removed.filter((scope) => scope === 'patient.read')).toHaveLength(3);
      expect(removed.filter((scope) => scope === 'patient.write')).toHaveLength(3);
      expect(removed).not.toContain('offline_access');
    });

    it('Skips malformed resource servers without services while processing approvals', async () => {
      setUpKeycloak({ existingClientScopes: ['patient.read'] });
      const integration = await buildSdxIntegration('sdx-approval-malformed-resource-server');

      await expect(
        processSdxWorkflowUpdates(integration.id, {
          integrationId: integration.id,
          resourceServers: [
            { id: 'broken-rs', environment: NON_PRODUCTION_ENV, services: undefined } as any,
            selectedResourceServer(NON_PRODUCTION_ENV, ['patient.read']),
          ],
        } as any),
      ).resolves.toBeUndefined();

      expect(keycloak.addOptionalClientScope).toHaveBeenCalledWith({
        id: 'kc-client-uuid',
        realm: 'standard',
        clientScopeId: 'patient.read',
      });
    });

    it('Does not skip keycloak environments that are not enabled for the integration', async () => {
      const integration = await buildSdxIntegration('sdx-approval-limited-environments', { environments: ['test'] });

      await putSdxAllowedAccess(integration.id, approvalPayload(NON_PRODUCTION_ENV, ['patient.read']), signToken());

      // manageKeycloakScopes and its internal removeSdxAccessByScopes call each look up their own admin client.
      expect(adminClientEnvironments()).toEqual(['dev', 'test']);
    });
  });

  describe('getSdxSubsystemStatus', () => {
    it('Returns the subsystem status payload from the SDX API', async () => {
      setUpSdxApi({ subsystemStatus: 'registered' });

      const result = await getSdxSubsystemStatus(123);

      expect(result).toEqual({ status: 'registered' });
    });

    it('Throws when the SDX API responds with an error', async () => {
      setUpSdxApi({ failOn: (url) => /\/integrations\/\d+$/.test(url) });

      await expect(getSdxSubsystemStatus(123)).rejects.toThrow('Failed to fetch SDX status');
    });
  });
});
