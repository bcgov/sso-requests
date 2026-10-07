import { Integration } from '@app/interfaces/Request';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { listClientCompositeRoles, listClientRoleUsers } from './helpers/modules/roles';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

// Mock at the admin client level so the real keycloak/users logic runs.
const mockKcAdminClient = {
  clients: {
    find: jest.fn(() => Promise.resolve([{ id: 'client-uuid' }])),
    listRoles: jest.fn(() => Promise.resolve([{ name: 'role1' }, { name: 'role2' }])),
    findRole: jest.fn(() => Promise.resolve({ id: 'role1-uuid', name: 'role1', composite: true })),
    findUsersWithRole: jest.fn(() =>
      Promise.resolve([{ id: 'sa-uuid', enabled: true, username: 'service-account-my-client-1' }]),
    ),
  },
  roles: {
    getCompositeRolesForClient: jest.fn(() => Promise.resolve([{ name: 'role2' }])),
  },
};

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: jest.fn(() => Promise.resolve({ kcAdminClient: mockKcAdminClient })),
}));

describe.each(['service-account', 'both'])('Role management for %s integrations', (authType) => {
  let integration: Integration;

  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: `Service Account Roles ${authType}`,
      authType,
      publicAccess: false,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('lists the service accounts assigned to a role', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const res = await listClientRoleUsers(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual([expect.objectContaining({ username: 'service-account-my-client-1' })]);
  });

  it('lists the composite roles of a role', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const res = await listClientCompositeRoles(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual(['role2']);
  });
});
