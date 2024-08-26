import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { getListOfIntegrations } from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { buildIntegration } from './helpers/modules/common';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

const PROJECT_NAME_SHARED = 'proj';
const PROJECT_NAME_1 = 'proj1';
const PROJECT_NAME_2 = 'proj2';

describe('Search all requests', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  let firstId, secondId, firstClientId, secondClientId;

  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
    await cleanUpDatabaseTables();

    // Create and save the autogenerated ids for search testing
    const integration1 = await buildIntegration({ projectName: PROJECT_NAME_1, submitted: true });
    firstId = integration1.body.id;
    firstClientId = integration1.body.clientId;

    const integration2 = await buildIntegration({ projectName: PROJECT_NAME_2, submitted: true });
    secondId = integration2.body.id;
    secondClientId = integration2.body.clientId;
  });

  it('Only allows sso-admins to search all requests', async () => {
    // Override to non-admin login and check forbidden
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let result = await getListOfIntegrations();
    expect(result.statusCode).toBe(403);

    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
    result = await getListOfIntegrations();
    expect(result.statusCode).toBe(200);
  });

  it('Can search by project name', async () => {
    let result = await getListOfIntegrations({ searchField: ['projectName'], searchKey: PROJECT_NAME_1 });
    expect(result.body.count).toBe(1);

    // Searching the root name should return both
    result = await getListOfIntegrations({ searchField: ['projectName'], searchKey: PROJECT_NAME_SHARED });
    expect(result.body.count).toBe(2);
  });

  it('Can search by project id', async () => {
    let result = await getListOfIntegrations({ searchField: ['id'], searchKey: firstId });
    expect(result.body.count).toBe(1);
    expect(result.body.rows[0].id).toBe(firstId);

    result = await getListOfIntegrations({ searchField: ['id'], searchKey: secondId });
    expect(result.body.count).toBe(1);
    expect(result.body.rows[0].id).toBe(secondId);
  });

  it('Can search by client id', async () => {
    let result = await getListOfIntegrations({ searchField: ['clientId'], searchKey: firstClientId });
    expect(result.body.count).toBe(1);
    expect(result.body.rows[0].clientId).toBe(firstClientId);

    // Both client ids should share the root project name
    result = await getListOfIntegrations({ searchField: ['clientId'], searchKey: PROJECT_NAME_SHARED });
    expect(result.body.count).toBe(2);
  });
});