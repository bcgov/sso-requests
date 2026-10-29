import { Integration } from '@app/interfaces/Request';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { listClientCompositeRoles, listClientRoleUsers } from './helpers/modules/roles';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import * as grafanaModule from '@app/utils/grafana';

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

jest.mock('@app/utils/grafana', () => ({
  ...jest.requireActual('@app/utils/grafana'),
  fetchKeycloakRoleUsersCount: jest.fn(() => Promise.resolve(1)),
}));

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
    const res = await listClientRoleUsers(integration.id!, 'role1', true);
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual([expect.objectContaining({ username: 'service-account-my-client-1' })]);
    expect(res.body?.totalCount).toBe(1);
  });

  it('lists the composite roles of a role', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const res = await listClientCompositeRoles(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual(['role2']);
  });
});

describe('Client Role Users', () => {
  let integration: Integration;
  beforeAll(async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: `Browser Login and Service Account`,
      authType: 'both',
      publicAccess: false,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('should be able to list client role users with and without service accounts', async () => {
    jest.spyOn(mockKcAdminClient.clients, 'findUsersWithRole').mockResolvedValue([
      { id: 'user-id-01', username: 'user01@bcgovidir' },
      { id: 'user-id-02', username: 'user02@bcgovidir' },
      { id: 'user-id-03', username: 'user03@bcgovidir' },
      { id: 'user-id-04', username: 'user04@bcgovidir' },
      { id: 'user-id-05', username: 'user05@bcgovidir' },
      { id: 'user-id-06', username: 'user06@bcgovidir' },
      { id: 'user-id-07', username: 'user07@bcgovidir' },
      { id: 'user-id-08', username: 'user08@bcgovidir' },
      { id: 'user-id-09', username: 'user09@bcgovidir' },
      { id: 'user-id-10', username: 'user10@bcgovidir' },
      { id: 'sa-uuid', enabled: true, username: 'service-account-my-client-1' },
    ] as any);
    jest.spyOn(grafanaModule, 'fetchKeycloakRoleUsersCount').mockResolvedValueOnce(10);
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let res = await listClientRoleUsers(integration.id!, 'role1', false);
    expect(res.status).toEqual(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.totalCount).toEqual(10);
    expect(res.body.data).not.toEqual(
      expect.arrayContaining([{ id: 'sa-uuid', enabled: true, username: 'service-account-my-client-1' }]),
    );

    jest.spyOn(grafanaModule, 'fetchKeycloakRoleUsersCount').mockResolvedValueOnce(1);
    res = await listClientRoleUsers(integration.id!, 'role1', true);
    expect(res.status).toEqual(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totalCount).toEqual(1);
    expect(res.body.data).toEqual(
      expect.arrayContaining([{ id: 'sa-uuid', enabled: true, username: 'service-account-my-client-1' }]),
    );
  });
});
