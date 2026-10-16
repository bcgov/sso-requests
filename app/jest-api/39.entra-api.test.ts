import axios from 'axios';
import { ENTRA_GRAPH_API_APPLICATION_ID, KC_ENTRA_IDP_REALM, bcgovIdirIdpMappers } from '@app/utils/constants';
import { formDataDev } from './helpers/fixtures';
import { cleanUpDatabaseTables } from './helpers/utils';
import { getEntraClientByRequestId, saveEntraClient } from '@app/queries/entra-client';
import { getByBcgovUnitAndDivision } from '@app/queries/division';
import { validateIDPs } from '@app/utils/helpers';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { models } from '@app/shared/sequelize/models/models';
import { logger } from '@app/utils/logger';

/*
 * Module mocks
 *
 * The controller-level tests run the real `@app/controllers/requests` against mocked Graph/Keycloak
 * boundaries; the Graph-level tests pull the real `@app/utils/graph-api` back in via requireActual
 * and mock only the HTTP layer (axios) and token acquisition (msal).
 */

jest.mock('axios');
// Every module logger is a child of the root logger; collapse them all into one mock so log calls can be asserted.
jest.mock('@app/utils/logger', () => {
  const log: any = { trace: jest.fn(), debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
  log.child = () => log;
  return { ...jest.requireActual('@app/utils/logger'), logger: log };
});
jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn(),
}));
jest.mock('@app/utils/graph-api', () => ({
  setupEntraIntegration: jest.fn(),
  updateEntraIntegration: jest.fn(),
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

jest.unmock('@app/queries/bcgov-unit');
jest.unmock('@app/queries/division');

// graph-api reads these at module load, so they must be set before the actual module is first required below.
process.env.ENTRA_CUSTOM_CLAIM_MAPPING_POLICY_ID = 'claim-mapping-policy-id';
process.env.ENTRA_SYNCED_IDIR_USERS_GROUP_ID = 'synced-idir-users-group-id';
process.env.ENTRA_DEFAULT_APP_ROLE_ID = 'default-app-role-id';

const requests = jest.requireActual('@app/controllers/requests') as typeof import('@app/controllers/requests');
const actualGraphApi = jest.requireActual('@app/utils/graph-api') as typeof import('@app/utils/graph-api');
const { computeThumbprint, getApplicationNotes } = jest.requireActual(
  '@app/utils/entra-helpers',
) as typeof import('@app/utils/entra-helpers');
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

/*
 * Shared fixtures
 */

// The Entra app registration / service principal that Graph hands back for every integration.
const entraApp = {
  appId: 'app-id',
  appObjectId: 'app-object-id',
  servicePrincipalId: 'service-principal-id',
  keyThumbprint: 'key-thumbprint',
};

// Keycloak's active signing certificate, uploaded to the Entra app as its key credential.
const kcCert = {
  kid: 'kc-key-id',
  certificatePem: '-----BEGIN CERTIFICATE-----\nkc-cert\n-----END CERTIFICATE-----',
  certificateRawBase64: 'kc-cert',
};

// BC Gov units and divisions; ids are assigned once the rows are created in beforeAll.
type Org = { name: string; code: string; id?: number };
const citizensServices: Org = { name: 'Citizens Services', code: 'CITZ' };
const technologyDivision: Org = { name: 'Technology Division', code: 'TD' };
const securityDivision: Org = { name: 'Security Division', code: 'SD' };
const finance: Org = { name: 'Finance', code: 'FIN' };
const treasuryDivision: Org = { name: 'Treasury Division', code: 'TRS' };

const createUnitWithDivisions = async (unit: Org, divisions: Org[]) => {
  unit.id = (await models.bcgovUnit.create({ name: unit.name, code: unit.code })).id;
  for (const division of divisions) {
    division.id = (await models.division.create({ name: division.name, code: division.code, bcgovUnitId: unit.id })).id;
  }
};

// The base integration (request id 1) under Citizens Services / Technology Division.
const integration = {
  ...formDataDev,
  clientId: 'entra-client',
  projectName: 'Entra Project',
  devIdps: [KC_ENTRA_IDP_REALM],
};
type Integration = typeof integration;

// Entra client rows persist across tests, so each test that touches them gets its own request id.
let nextRequestId = 100;
const newIntegration = (overrides: Partial<Integration> = {}): Integration => ({
  ...integration,
  id: nextRequestId++,
  ...overrides,
});

// Entra app naming convention: <unit code>-<division code>-<project name without spaces>-<request id>-<Env>.
const appNameFor = (
  id: number,
  { unit = citizensServices, division = technologyDivision, project = 'EntraProject' } = {},
) => `${unit.code}-${division.code}-${project}-${id}-Dev`;

// Edits to an existing integration that must be pushed to its Entra app. Shared by the controller tests
// (which decide to update rather than reprovision) and the Graph tests (which decide what gets patched).
const fieldChanges = [
  {
    field: 'projectName',
    changes: (): Partial<Integration> => ({ projectName: 'Renamed Project' }),
    unit: citizensServices,
    division: technologyDivision,
    project: 'RenamedProject',
  },
  {
    field: 'description',
    changes: (): Partial<Integration> => ({ description: 'An updated description' }),
    unit: citizensServices,
    division: technologyDivision,
  },
  {
    field: 'bcgov unit',
    changes: (): Partial<Integration> => ({ bcgovUnitId: finance.id, divisionId: treasuryDivision.id }),
    unit: finance,
    division: treasuryDivision,
  },
  {
    field: 'division',
    changes: (): Partial<Integration> => ({ divisionId: securityDivision.id }),
    unit: citizensServices,
    division: securityDivision,
  },
];

/*
 * Shared helpers
 */

const findEntraClients = (request: Integration) =>
  getEntraClientByRequestId({ integrationId: request.id!, environment: 'dev' });

// An integration whose Entra app has already been provisioned and recorded in the database.
const givenProvisionedIntegration = async (overrides: Partial<Integration> = {}) => {
  const request = newIntegration(overrides);
  await saveEntraClient({
    appName: appNameFor(request.id!),
    appId: entraApp.appId,
    keyThumbprint: entraApp.keyThumbprint,
    servicePrincipalId: entraApp.servicePrincipalId,
    environment: 'dev',
    requestId: request.id!,
  });
  return request;
};

// Keycloak already has the Entra IdP for this integration, optionally with all of its mappers.
const givenExistingKeycloakIdp = ({ withMappers = true } = {}) => {
  idp.getIdp.mockResolvedValue({ alias: integration.clientId } as never);
  if (withMappers) idp.getIdpMappers.mockResolvedValue(bcgovIdirIdpMappers as never);
};

const setupKeycloakAdminClient = ({ archived = false } = {}) => {
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

// Graph endpoints (pathnames only; query strings are ignored when routing).
const graphPaths = {
  applications: '/v1.0/applications',
  application: `/v1.0/applications/${entraApp.appObjectId}`,
  applicationByAppId: `/v1.0/applications(appId='${entraApp.appId}')`,
  servicePrincipals: '/v1.0/servicePrincipals',
  servicePrincipal: (id = entraApp.servicePrincipalId) => `/v1.0/servicePrincipals/${id}`,
  claimsMappingPolicies: (spId: string) => `/v1.0/servicePrincipals/${spId}/claimsMappingPolicies`,
  appRoleAssignedTo: `/v1.0/servicePrincipals(appId='${entraApp.appId}')/appRoleAssignedTo`,
  oauth2PermissionGrants: '/v1.0/oauth2PermissionGrants',
  servicePrincipalOauth2PermissionGrants: (spId: string) => `/v1.0/servicePrincipals/${spId}/oauth2PermissionGrants`,
};

// Routes mocked Graph calls by "<METHOD> <pathname>" to a response body; unrouted calls resolve with `{}`.
// A route may return a rejected promise to simulate a Graph failure, and receives the parsed URL when it
// needs to inspect the query string.
const mockGraphRoutes = (routes: Record<string, (url: URL) => unknown>) =>
  (axios.request as jest.Mock).mockImplementation(async ({ method, url }) => {
    const parsedUrl = new URL(url);
    const route = routes[`${method} ${parsedUrl.pathname}`];
    return { data: route ? await route(parsedUrl) : {} };
  });

// Graph calls made so far, optionally filtered by method and pathname.
const graphCalls = (method?: string, path?: string) =>
  (axios.request as jest.Mock).mock.calls
    .map(([config]) => config)
    .filter((config) => (!method || config.method === method) && (!path || new URL(config.url).pathname === path));

// The shape of an axios error carrying a Graph HTTP status.
const graphError = (status: number) => ({ response: { status, headers: {} } });

/*
 * Lifecycle
 */

beforeAll(async () => {
  await cleanUpDatabaseTables();
  await createUnitWithDivisions(citizensServices, [technologyDivision, securityDivision]);
  await createUnitWithDivisions(finance, [treasuryDivision]);
  integration.bcgovUnitId = citizensServices.id;
  integration.divisionId = technologyDivision.id;
});

beforeEach(() => {
  jest.clearAllMocks();
  // Default to a brand-new integration: nothing exists in Keycloak yet and Graph provisioning succeeds.
  idp.getIdp.mockResolvedValue(undefined);
  idp.getIdpMappers.mockResolvedValue([]);
  keys.getActivePS256KeyCert.mockResolvedValue(kcCert);
  graphApi.setupEntraIntegration.mockResolvedValue({
    appId: entraApp.appId,
    servicePrincipalId: entraApp.servicePrincipalId,
    secret: { customKeyIdentifier: entraApp.keyThumbprint },
  });
});

/*
 * Request validation
 */

// validateIDPs no longer reads the session: the caller says whether the actor may add a restricted IdP.
// bcgovidir is no longer restricted, so either kind of actor may add it.
describe('validateIDPs for the bcgovidir identity provider', () => {
  it.each([
    { actor: 'a regular user', canAddRestrictedIdps: false },
    { actor: 'an actor who may add restricted idps', canAddRestrictedIdps: true },
  ])('allows $actor to add it', ({ canAddRestrictedIdps }) => {
    expect(
      validateIDPs({
        currentIdps: ['digitalcredential'],
        updatedIdps: ['digitalcredential', KC_ENTRA_IDP_REALM],
        canAddRestrictedIdps,
      }),
    ).toBe(true);
  });
});

// updateRequest rejects a submission when the division doesn't belong to the chosen
// bcgov unit; this pins the query that decision is built on.
describe('getByBcgovUnitAndDivision', () => {
  it('resolves the division when it belongs to the given bcgov unit', async () => {
    await expect(getByBcgovUnitAndDivision(citizensServices.id!, technologyDivision.id!)).resolves.toEqual(
      expect.objectContaining({ id: technologyDivision.id, bcgovUnitId: citizensServices.id }),
    );
  });

  it('resolves nothing when the division belongs to a different bcgov unit', async () => {
    await expect(getByBcgovUnitAndDivision(finance.id!, technologyDivision.id!)).resolves.toBeNull();
  });

  it('resolves nothing for a divisionId that does not exist', async () => {
    await expect(getByBcgovUnitAndDivision(citizensServices.id!, 999999)).resolves.toBeNull();
  });
});

/*
 * Controller: @app/controllers/requests (Graph and Keycloak are mocked)
 */

describe('createEntraIntegration', () => {
  describe('for a new integration', () => {
    it('provisions the Entra app, persists it, and configures the Keycloak IdP and mappers', async () => {
      await requests.createEntraIntegration('dev', integration);

      expect(graphApi.setupEntraIntegration).toHaveBeenCalledWith(
        appNameFor(integration.id!),
        'dev',
        integration,
        expect.anything(),
        citizensServices.name,
        technologyDivision.name,
      );
      await expect(findEntraClients(integration)).resolves.toEqual([
        expect.objectContaining({
          appName: appNameFor(integration.id!),
          appId: entraApp.appId,
          keyThumbprint: entraApp.keyThumbprint,
          servicePrincipalId: entraApp.servicePrincipalId,
        }),
      ]);
      expect(idp.createIdp).toHaveBeenCalledWith(
        expect.objectContaining({
          alias: integration.clientId,
          displayName: integration.projectName,
          realm: KC_ENTRA_IDP_REALM,
          config: expect.objectContaining({ clientId: entraApp.appId }),
        }),
        'dev',
      );
      expect(idp.createIdpMapper).toHaveBeenCalledTimes(bcgovIdirIdpMappers.length);
      expect(idp.createIdpMapper).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'username', idpAlias: integration.clientId, realmName: KC_ENTRA_IDP_REALM }),
      );
    });

    it('folds the bcgov unit and division codes into the app name so different units cannot collide', async () => {
      const health: Org = { name: 'Health', code: 'HLTH' };
      const dataDivision: Org = { name: 'Data Division', code: 'DD' };
      await createUnitWithDivisions(health, [dataDivision]);
      const request = newIntegration({ bcgovUnitId: health.id, divisionId: dataDivision.id });

      await requests.createEntraIntegration('dev', request);

      expect(graphApi.setupEntraIntegration).toHaveBeenCalledWith(
        appNameFor(request.id!, { unit: health, division: dataDivision }),
        'dev',
        request,
        expect.anything(),
        health.name,
        dataDivision.name,
      );
    });

    it('logs and rethrows an Entra provisioning failure without touching Keycloak', async () => {
      const error = new Error('invalid Entra response');
      graphApi.setupEntraIntegration.mockRejectedValue(error);

      await expect(requests.createEntraIntegration('dev', newIntegration())).rejects.toThrow(error);

      expect(logger.error).toHaveBeenCalledWith({ err: error }, 'could not create Entra integration');
      expect(idp.createIdp).not.toHaveBeenCalled();
    });
  });

  // The app name and notes are derived from the unit and division, so provisioning must stop with a
  // descriptive error (rather than crash on a null lookup) when either cannot be resolved.
  describe('when the bcgov unit or division cannot be resolved', () => {
    let consoleError: jest.SpyInstance;
    beforeEach(() => {
      consoleError = jest.spyOn(console, 'error').mockImplementation();
    });
    afterEach(() => consoleError.mockRestore());

    it.each([
      {
        scenario: 'bcgovUnitId and divisionId are missing',
        overrides: { bcgovUnitId: undefined, divisionId: undefined },
        error: 'BC Government Unit and division are required to create an Entra integration',
      },
      {
        scenario: 'bcgovUnitId does not reference an existing unit',
        overrides: { bcgovUnitId: 999999 },
        error: 'No BC Government Unit found for bcgovUnitId 999999',
      },
      {
        scenario: 'divisionId does not reference an existing division',
        overrides: { divisionId: 999999 },
        error: 'No division found for divisionId 999999',
      },
    ])('throws a clear error when $scenario', async ({ overrides, error }) => {
      await expect(requests.createEntraIntegration('dev', newIntegration(overrides))).rejects.toThrow(error);

      expect(graphApi.setupEntraIntegration).not.toHaveBeenCalled();
    });
  });

  // Re-running create for an integration that already has an Entra app must update that app in place
  // and leave the existing Keycloak IdP and mappers alone.
  describe('for an integration with an existing Entra app', () => {
    beforeEach(() => givenExistingKeycloakIdp());

    it('updates the app instead of reprovisioning it or duplicating Keycloak resources', async () => {
      const request = await givenProvisionedIntegration();

      await requests.createEntraIntegration('dev', request);

      expect(graphApi.setupEntraIntegration).not.toHaveBeenCalled();
      expect(graphApi.updateEntraIntegration).toHaveBeenCalledWith(
        entraApp.appId,
        entraApp.servicePrincipalId,
        appNameFor(request.id!),
        expect.objectContaining({ id: request.id }),
        'dev',
        citizensServices.name,
        technologyDivision.name,
      );
      await expect(findEntraClients(request)).resolves.toHaveLength(1);
      expect(idp.createIdp).not.toHaveBeenCalled();
      expect(idp.createIdpMapper).not.toHaveBeenCalled();
    });

    it.each(fieldChanges)(
      'pushes the new app name, unit and division to Entra when the $field changes',
      async ({ changes, unit, division, project }) => {
        const request = { ...(await givenProvisionedIntegration()), ...changes() };

        await requests.createEntraIntegration('dev', request);

        expect(graphApi.setupEntraIntegration).not.toHaveBeenCalled();
        expect(graphApi.updateEntraIntegration).toHaveBeenCalledTimes(1);
        expect(graphApi.updateEntraIntegration).toHaveBeenCalledWith(
          entraApp.appId,
          entraApp.servicePrincipalId,
          appNameFor(request.id!, { unit, division, project }),
          expect.objectContaining(changes()),
          'dev',
          unit.name,
          division.name,
        );
        expect(idp.createIdp).not.toHaveBeenCalled();
      },
    );
  });
});

describe('deleteEntraIntegration', () => {
  it('deletes the Entra service principal and app, the Keycloak IdP, and the persisted record', async () => {
    const request = await givenProvisionedIntegration();
    givenExistingKeycloakIdp({ withMappers: false });

    await requests.deleteEntraIntegration('dev', request);

    expect(graphApi.deleteServicePrincipal).toHaveBeenCalledWith(entraApp.servicePrincipalId);
    expect(graphApi.deleteAppRegistration).toHaveBeenCalledWith(entraApp.appId);
    expect(idp.deleteIdp).toHaveBeenCalledWith({
      environment: 'dev',
      idpAlias: integration.clientId,
      realmName: KC_ENTRA_IDP_REALM,
    });
    await expect(findEntraClients(request)).resolves.toEqual([]);
  });

  it('removes the persisted record even when the Keycloak IdP is already gone', async () => {
    const request = await givenProvisionedIntegration();

    await requests.deleteEntraIntegration('dev', request);

    expect(idp.deleteIdp).not.toHaveBeenCalled();
    await expect(findEntraClients(request)).resolves.toEqual([]);
  });

  it('does nothing when the integration has no Entra record', async () => {
    await requests.deleteEntraIntegration('dev', newIntegration());

    expect(graphApi.deleteServicePrincipal).not.toHaveBeenCalled();
    expect(graphApi.deleteAppRegistration).not.toHaveBeenCalled();
    expect(idp.deleteIdp).not.toHaveBeenCalled();
  });

  it('logs and rethrows an Entra delete failure without deleting the app registration', async () => {
    const request = await givenProvisionedIntegration();
    const error = new Error('invalid Entra response');
    graphApi.deleteServicePrincipal.mockRejectedValue(error);

    await expect(requests.deleteEntraIntegration('dev', request)).rejects.toThrow(error);

    expect(logger.error).toHaveBeenCalledWith({ err: error }, 'could not delete Entra integration');
    expect(graphApi.deleteAppRegistration).not.toHaveBeenCalled();
  });
});

// keycloakClient drives the whole lifecycle; Entra must be in place before the Keycloak client that uses it,
// and torn down before that client is removed.
describe('keycloakClient Entra orchestration', () => {
  it('creates the Entra integration before provisioning the Keycloak client', async () => {
    const kcAdminClient = setupKeycloakAdminClient();
    (axios.get as jest.Mock).mockResolvedValue({ data: [] });

    await expect(keycloakClient('dev', integration)).resolves.toBe(true);

    expect(keycloakRequests.createEntraIntegration).toHaveBeenCalledWith('dev', integration);
    expect(kcAdminClient.clients.create).toHaveBeenCalled();
  });

  it('deletes the Entra integration before deleting an archived Keycloak client', async () => {
    const kcAdminClient = setupKeycloakAdminClient({ archived: true });

    await expect(keycloakClient('dev', { ...integration, archived: true })).resolves.toBe(true);

    expect(keycloakRequests.deleteEntraIntegration).toHaveBeenCalledWith(
      'dev',
      expect.objectContaining({ archived: true }),
    );
    expect(kcAdminClient.clients.del).toHaveBeenCalledWith({ id: 'keycloak-client-id', realm: 'standard' });
  });
});

/*
 * Graph client: @app/utils/graph-api (only axios and msal are mocked)
 */

describe('Microsoft Graph API', () => {
  beforeEach(() => {
    (ConfidentialClientApplication as jest.Mock).mockImplementation(() => ({
      acquireTokenByClientCredential: jest.fn(() =>
        Promise.resolve({ accessToken: 'graph-token', expiresOn: new Date(Date.now() + 3600_000) }),
      ),
    }));
  });

  describe('setupEntraIntegration', () => {
    const requiredScopes = 'openid profile email';
    const graphServicePrincipal = { id: 'graph-service-principal-id', appId: ENTRA_GRAPH_API_APPLICATION_ID };

    // Graph state for an app whose registration, key credential, claim mapping policy and delegated scopes are
    // already in place, so each test only varies the service principal, app role assignment and scope grants it
    // cares about.
    const mockExistingApp = ({
      servicePrincipals = [{ id: entraApp.servicePrincipalId, appId: entraApp.appId }],
      appRoleAssignments = [] as unknown[],
      grantError = undefined as unknown,
      grantedScopes = [{ id: 'grant-id', scope: requiredScopes }] as unknown[],
      graphServicePrincipals = [graphServicePrincipal] as unknown[],
      scopeGrantError = undefined as unknown,
    } = {}) => {
      const servicePrincipalId = servicePrincipals[0]?.id ?? 'new-service-principal-id';
      mockGraphRoutes({
        [`GET ${graphPaths.applications}`]: () => ({
          value: [
            {
              id: entraApp.appObjectId,
              appId: entraApp.appId,
              displayName: appNameFor(integration.id!),
              keyCredentials: [{ customKeyIdentifier: computeThumbprint(kcCert.certificateRawBase64) }],
              api: { acceptMappedClaims: true },
            },
          ],
        }),
        [`GET ${graphPaths.servicePrincipals}`]: (url) => ({
          value: url.searchParams.get('$filter')?.includes(ENTRA_GRAPH_API_APPLICATION_ID)
            ? graphServicePrincipals
            : servicePrincipals,
        }),
        [`POST ${graphPaths.servicePrincipals}`]: () => ({ id: servicePrincipalId, appId: entraApp.appId }),
        [`GET ${graphPaths.claimsMappingPolicies(servicePrincipalId)}`]: () => ({
          value: [{ id: 'claim-mapping-policy-id' }],
        }),
        [`GET ${graphPaths.appRoleAssignedTo}`]: () => ({ value: appRoleAssignments }),
        ...(grantError ? { [`POST ${graphPaths.appRoleAssignedTo}`]: () => Promise.reject(grantError) } : {}),
        [`GET ${graphPaths.servicePrincipalOauth2PermissionGrants(servicePrincipalId)}`]: () => ({
          value: grantedScopes,
        }),
        ...(scopeGrantError
          ? { [`POST ${graphPaths.oauth2PermissionGrants}`]: () => Promise.reject(scopeGrantError) }
          : {}),
      });
    };

    const graphServicePrincipalLookups = () =>
      graphCalls('GET', graphPaths.servicePrincipals).filter((config) =>
        new URL(config.url).searchParams.get('$filter')?.includes(ENTRA_GRAPH_API_APPLICATION_ID),
      );

    const setup = () =>
      actualGraphApi.setupEntraIntegration(
        appNameFor(integration.id!),
        'dev',
        integration,
        kcCert,
        citizensServices.name,
        technologyDivision.name,
      );

    // Every Entra app must be usable by synced IDIR users: the default app role is granted to their group
    // exactly once.
    describe('default app role assignment', () => {
      it('grants the synced IDIR users group the default app role when the app has no assignments', async () => {
        mockExistingApp();

        await expect(setup()).resolves.toEqual(
          expect.objectContaining({ appId: entraApp.appId, servicePrincipalId: entraApp.servicePrincipalId }),
        );

        expect(graphCalls('GET', graphPaths.appRoleAssignedTo)).toHaveLength(1);
        const grants = graphCalls('POST', graphPaths.appRoleAssignedTo);
        expect(grants).toHaveLength(1);
        expect(grants[0].data).toEqual({
          principalId: 'synced-idir-users-group-id',
          resourceId: entraApp.servicePrincipalId,
          appRoleId: 'default-app-role-id',
        });
      });

      it('does not grant another assignment when the app already has one', async () => {
        mockExistingApp({ appRoleAssignments: [{ id: 'assignment-id', principalId: 'synced-idir-users-group-id' }] });

        await setup();

        expect(graphCalls('GET', graphPaths.appRoleAssignedTo)).toHaveLength(1);
        expect(graphCalls('POST', graphPaths.appRoleAssignedTo)).toHaveLength(0);
      });

      it('requires assignment on a newly created service principal and grants the role against it', async () => {
        mockExistingApp({ servicePrincipals: [] });

        await expect(setup()).resolves.toEqual(
          expect.objectContaining({ servicePrincipalId: 'new-service-principal-id' }),
        );

        const servicePrincipalCreates = graphCalls('POST', graphPaths.servicePrincipals);
        expect(servicePrincipalCreates).toHaveLength(1);
        expect(servicePrincipalCreates[0].data).toEqual(
          expect.objectContaining({ appId: entraApp.appId, appRoleAssignmentRequired: true }),
        );
        const grants = graphCalls('POST', graphPaths.appRoleAssignedTo);
        expect(grants).toHaveLength(1);
        expect(grants[0].data).toEqual(expect.objectContaining({ resourceId: 'new-service-principal-id' }));
      });

      it('logs and throws when the assignment cannot be granted', async () => {
        const error = new Error('graph failure');
        mockExistingApp({ grantError: error });

        await expect(setup()).rejects.toThrow(
          `Unable to grant app role assignment for application with objectId: ${entraApp.appId}`,
        );

        expect(logger.error).toHaveBeenCalledWith({ err: error }, 'grantAppRoleAssignment failed');
      });
    });

    // Every Entra app must have tenant-wide admin consent for the Microsoft Graph OIDC scopes so users are never
    // prompted for consent at login.
    describe('delegated scope permissions', () => {
      it('grants admin consent for the OIDC scopes on Microsoft Graph when the app has no grants', async () => {
        mockExistingApp({ grantedScopes: [] });

        await setup();

        expect(
          graphCalls('GET', graphPaths.servicePrincipalOauth2PermissionGrants(entraApp.servicePrincipalId)),
        ).toHaveLength(1);
        expect(graphServicePrincipalLookups()).toHaveLength(1);
        const grants = graphCalls('POST', graphPaths.oauth2PermissionGrants);
        expect(grants).toHaveLength(1);
        expect(grants[0].data).toEqual({
          clientId: entraApp.servicePrincipalId,
          consentType: 'AllPrincipals',
          resourceId: graphServicePrincipal.id,
          scope: requiredScopes,
        });
      });

      it('grants the OIDC scopes when the existing grants do not include them', async () => {
        mockExistingApp({ grantedScopes: [{ id: 'grant-id', scope: 'User.Read' }] });

        await setup();

        const grants = graphCalls('POST', graphPaths.oauth2PermissionGrants);
        expect(grants).toHaveLength(1);
        expect(grants[0].data).toEqual(expect.objectContaining({ scope: requiredScopes }));
      });

      it('does not look up Microsoft Graph or grant again when the OIDC scopes are already granted', async () => {
        mockExistingApp();

        await setup();

        expect(
          graphCalls('GET', graphPaths.servicePrincipalOauth2PermissionGrants(entraApp.servicePrincipalId)),
        ).toHaveLength(1);
        expect(graphServicePrincipalLookups()).toHaveLength(0);
        expect(graphCalls('POST', graphPaths.oauth2PermissionGrants)).toHaveLength(0);
      });

      it('grants the OIDC scopes to a newly created service principal', async () => {
        mockExistingApp({ servicePrincipals: [], grantedScopes: [] });

        await setup();

        expect(
          graphCalls('GET', graphPaths.servicePrincipalOauth2PermissionGrants('new-service-principal-id')),
        ).toHaveLength(1);
        const grants = graphCalls('POST', graphPaths.oauth2PermissionGrants);
        expect(grants).toHaveLength(1);
        expect(grants[0].data).toEqual(
          expect.objectContaining({ clientId: 'new-service-principal-id', resourceId: graphServicePrincipal.id }),
        );
      });

      it('throws without granting when the Microsoft Graph service principal cannot be found', async () => {
        mockExistingApp({ grantedScopes: [], graphServicePrincipals: [] });

        await expect(setup()).rejects.toThrow('Unable to find the Microsoft Graph API service principal');

        expect(graphCalls('POST', graphPaths.oauth2PermissionGrants)).toHaveLength(0);
      });

      it('logs and throws when the scope permissions cannot be granted', async () => {
        const error = new Error('graph failure');
        mockExistingApp({ grantedScopes: [], scopeGrantError: error });

        await expect(setup()).rejects.toThrow(
          `Unable to grant scope permissions for service principal with objectId: ${entraApp.servicePrincipalId}`,
        );

        expect(logger.error).toHaveBeenCalledWith({ err: error }, 'grantScopePermissions failed');
      });

      it('logs and throws when the existing scope grants cannot be read', async () => {
        const error = new Error('graph failure');
        mockExistingApp();
        const defaultRouting = (axios.request as jest.Mock).getMockImplementation()!;
        (axios.request as jest.Mock).mockImplementation((config) =>
          new URL(config.url).pathname ===
          graphPaths.servicePrincipalOauth2PermissionGrants(entraApp.servicePrincipalId)
            ? Promise.reject(error)
            : defaultRouting(config),
        );

        await expect(setup()).rejects.toThrow(
          `Unable to get granted scope permissions for service principal with objectId: ${entraApp.servicePrincipalId}`,
        );

        expect(logger.error).toHaveBeenCalledWith({ err: error }, 'getGrantedScopePermissions failed');
        expect(graphCalls('POST', graphPaths.oauth2PermissionGrants)).toHaveLength(0);
      });
    });
  });

  describe('updateEntraIntegration', () => {
    const currentAppName = appNameFor(integration.id!);
    const notesFor = (request: Integration, unit = citizensServices, division = technologyDivision) =>
      getApplicationNotes({
        environment: 'dev',
        requester: request.requester || '',
        bcgovUnitName: unit.name,
        divisionName: division.name,
        description: request.description || '<no description provided>',
      });

    const update = ({
      appName = currentAppName,
      request = integration,
      unit = citizensServices,
      division = technologyDivision,
    } = {}) =>
      actualGraphApi.updateEntraIntegration(
        entraApp.appId,
        entraApp.servicePrincipalId,
        appName,
        request,
        'dev',
        unit.name,
        division.name,
      );

    beforeEach(() => {
      // Notes embed a timestamp, so freeze the clock to make "unchanged" notes comparable.
      jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
      // Entra currently holds the base integration's name and notes.
      const currentNotes = notesFor(integration);
      mockGraphRoutes({
        [`GET ${graphPaths.applicationByAppId}`]: () => ({
          id: entraApp.appObjectId,
          appId: entraApp.appId,
          displayName: currentAppName,
          notes: currentNotes,
        }),
        [`GET ${graphPaths.servicePrincipals}`]: () => ({
          value: [{ id: entraApp.servicePrincipalId, appId: entraApp.appId }],
        }),
      });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it.each(fieldChanges)(
      'patches the app registration and service principal when the $field changes',
      async ({ changes, unit, division, project }) => {
        const request = { ...integration, ...changes() };
        const appName = appNameFor(integration.id!, { unit, division, project });
        const expectedNotes = notesFor(request, unit, division);

        await update({ appName, request, unit, division });

        const appPatches = graphCalls('PATCH', graphPaths.application);
        expect(appPatches).toHaveLength(1);
        expect(appPatches[0].data).toEqual({ displayName: appName, notes: expectedNotes });

        const servicePrincipalPatches = graphCalls('PATCH', graphPaths.servicePrincipal());
        expect(servicePrincipalPatches).toHaveLength(1);
        expect(servicePrincipalPatches[0].data).toEqual({ notes: expectedNotes });
      },
    );

    it('does not patch anything when the name and notes are unchanged', async () => {
      await update();

      expect(graphCalls('PATCH')).toHaveLength(0);
    });

    it('throws without patching when the app registration no longer exists', async () => {
      (axios.request as jest.Mock).mockResolvedValue({ data: { value: [] } });

      await expect(update()).rejects.toThrow(`No application registration found for app ${currentAppName}`);
      expect(graphCalls('PATCH')).toHaveLength(0);
    });
  });

  describe('callAzureGraphApi retries', () => {
    const servicePrincipalUrl = graphPaths.servicePrincipal();

    beforeEach(() => {
      jest.useFakeTimers();
      (axios.isAxiosError as unknown as jest.Mock).mockReturnValue(true);
    });

    afterEach(() => {
      jest.useRealTimers();
      (axios.isAxiosError as unknown as jest.Mock).mockReset();
    });

    // Fails each call with the given statuses in order, then succeeds with `data`.
    const mockGraphResponses = (statuses: number[], data: unknown) => {
      const request = axios.request as jest.Mock;
      statuses.forEach((status) => request.mockRejectedValueOnce(graphError(status)));
      request.mockResolvedValueOnce({ data });
    };

    describe('transient failures', () => {
      it('retries an idempotent request after a transient 404 and then succeeds', async () => {
        mockGraphResponses([404], { deleted: true });

        const response = actualGraphApi.callAzureGraphApi(servicePrincipalUrl, { method: 'DELETE' });
        await jest.advanceTimersByTimeAsync(1500);

        await expect(response).resolves.toEqual({ deleted: true });
        expect(axios.request).toHaveBeenCalledTimes(2);
      });

      it('retries a POST only when Graph confirms the request was not processed (503)', async () => {
        mockGraphResponses([503], { id: 'created' });

        const response = actualGraphApi.callAzureGraphApi(graphPaths.applications, {
          method: 'POST',
          data: { displayName: integration.projectName },
        });
        await jest.advanceTimersByTimeAsync(1500);

        await expect(response).resolves.toEqual({ id: 'created' });
        expect(axios.request).toHaveBeenCalledTimes(2);
      });

      it('gives up after the configured number of retries', async () => {
        const throttled = graphError(429);
        (axios.request as jest.Mock).mockRejectedValue(throttled);

        const response = actualGraphApi.callAzureGraphApi(servicePrincipalUrl, { method: 'DELETE' });
        const rejection = expect(response).rejects.toBe(throttled);
        await jest.advanceTimersByTimeAsync(60_000);

        await rejection;
        expect(axios.request).toHaveBeenCalledTimes(6);
      });
    });

    it.each([
      ['POST', 500],
      ['GET', 400],
    ])('does not retry a non-retryable %s %i response', async (method, status) => {
      const error = graphError(status);
      (axios.request as jest.Mock).mockRejectedValue(error);

      await expect(
        actualGraphApi.callAzureGraphApi(graphPaths.applications, { method: method as 'GET' | 'POST' }),
      ).rejects.toBe(error);
      expect(axios.request).toHaveBeenCalledTimes(1);
    });

    it('refreshes the access token once after a 401 response', async () => {
      mockGraphResponses([401], { value: [] });

      await expect(actualGraphApi.callAzureGraphApi(graphPaths.applications)).resolves.toEqual({ value: [] });

      expect(axios.request).toHaveBeenCalledTimes(2);
      expect(axios.request).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer graph-token' }) }),
      );
    });
  });
});
