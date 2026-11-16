import { Integration } from '@app/interfaces/Request';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { listClientCompositeRoles, listClientRoleServiceAccounts, listClientRoleUsers } from './helpers/modules/roles';
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
  fetchKeycloakRoleUsers: jest.fn(),
  fetchKeycloakRoleAssignedServiceAccounts: jest.fn(),
}));

// Mock at the admin client level so the real keycloak/users logic runs.
const mockKcAdminClient = {
  clients: {
    find: jest.fn(() => Promise.resolve([{ id: 'client-uuid' }])),
    listRoles: jest.fn(() => Promise.resolve([{ name: 'role1' }, { name: 'role2' }])),
    findRole: jest.fn(() => Promise.resolve({ id: 'role1-uuid', name: 'role1', composite: true })),
  },
  roles: {
    getCompositeRolesForClient: jest.fn(() => Promise.resolve([{ name: 'role2' }])),
  },
};

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: jest.fn(() => Promise.resolve({ kcAdminClient: mockKcAdminClient })),
}));

const serviceAccount = { id: 'sa-uuid', username: 'service-account-my-client-1' };
const roleUsers = Array.from({ length: 10 }, (_, i) => {
  const idx = String(i + 1).padStart(2, '0');
  return { id: `user-id-${idx}`, username: `user${idx}@bcgovidir` };
});

beforeEach(() => {
  jest.mocked(grafanaModule.fetchKeycloakRoleUsers).mockResolvedValue({ totalCount: 0, data: [] });
  jest
    .mocked(grafanaModule.fetchKeycloakRoleAssignedServiceAccounts)
    .mockResolvedValue({ totalCount: 1, data: [serviceAccount] });
});

afterEach(() => {
  jest.clearAllMocks();
});

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
    const res = await listClientRoleServiceAccounts(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body.data).toEqual([expect.objectContaining({ username: 'service-account-my-client-1' })]);
    expect(res.body?.totalCount).toBe(1);
    expect(grafanaModule.fetchKeycloakRoleAssignedServiceAccounts).toHaveBeenCalledWith(
      'dev',
      integration.clientId,
      'role1',
    );
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

  it('should list role users with the search and pagination params', async () => {
    jest.mocked(grafanaModule.fetchKeycloakRoleUsers).mockResolvedValueOnce({ totalCount: 10, data: roleUsers });
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let res = await listClientRoleUsers(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body.data).toHaveLength(10);
    expect(res.body.totalCount).toEqual(10);
    expect(grafanaModule.fetchKeycloakRoleUsers).toHaveBeenLastCalledWith(
      'dev',
      integration.clientId,
      'role1',
      '',
      50,
      0,
    );

    jest.mocked(grafanaModule.fetchKeycloakRoleUsers).mockResolvedValueOnce({ totalCount: 1, data: [roleUsers[0]] });
    res = await listClientRoleUsers(integration.id!, 'role1', { searchKey: 'user01', first: 5, max: 5 });
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ totalCount: 1, data: [roleUsers[0]] });
    expect(grafanaModule.fetchKeycloakRoleUsers).toHaveBeenLastCalledWith(
      'dev',
      integration.clientId,
      'role1',
      'user01',
      5,
      5,
    );
  });

  it('should list only the service accounts assigned to a role', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const res = await listClientRoleServiceAccounts(integration.id!, 'role1');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ totalCount: 1, data: [serviceAccount] });
    expect(grafanaModule.fetchKeycloakRoleUsers).not.toHaveBeenCalled();
  });

  it('should return an empty result without querying grafana when the role does not exist', async () => {
    jest.spyOn(mockKcAdminClient.clients, 'findRole').mockResolvedValueOnce(null as any);
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let res = await listClientRoleUsers(integration.id!, 'missing-role');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ totalCount: 0, data: [] });
    expect(grafanaModule.fetchKeycloakRoleUsers).not.toHaveBeenCalled();

    jest.spyOn(mockKcAdminClient.clients, 'findRole').mockResolvedValueOnce(null as any);
    res = await listClientRoleServiceAccounts(integration.id!, 'missing-role');
    expect(res.status).toEqual(200);
    expect(res.body).toEqual({ totalCount: 0, data: [] });
    expect(grafanaModule.fetchKeycloakRoleAssignedServiceAccounts).not.toHaveBeenCalled();
  });
});
