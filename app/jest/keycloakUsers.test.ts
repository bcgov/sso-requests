import { listRoleAssignedServiceAccounts, listRoleUsers } from '@app/keycloak/users';
import { fetchKeycloakRoleAssignedServiceAccounts, fetchKeycloakRoleUsers } from '@app/utils/grafana';

const CLIENT_ID = 'client-1';
const ROLE_NAME = 'editor';

const roleUsers = [
  { id: 'kc-idir-user', username: 'guid-1@idir' },
  { id: 'kc-azureidir-user', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user', username: 'guid-3@bceidbasic' },
];
const serviceAccounts = [{ id: 'kc-service-account-user', username: 'service-account-client-1' }];

const mockFindRole = jest.fn();

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: () =>
    Promise.resolve({
      kcAdminClient: {
        clients: {
          find: () => Promise.resolve([{ id: 'client-uuid' }]),
          findRole: (...args: any[]) => mockFindRole(...args),
        },
      },
    }),
}));

jest.mock('@app/utils/grafana', () => ({
  fetchKeycloakRoleUsers: jest.fn(),
  fetchKeycloakRoleAssignedServiceAccounts: jest.fn(),
}));

const integration = { clientId: CLIENT_ID, devIdps: ['idir', 'azureidir', 'bceidbasic'] } as any;

describe('listRoleUsers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindRole.mockResolvedValue({ name: ROLE_NAME });
    jest.mocked(fetchKeycloakRoleUsers).mockResolvedValue({ totalCount: roleUsers.length, data: roleUsers });
  });

  it('returns the role users from grafana using the default pagination', async () => {
    const users = await listRoleUsers(integration, { environment: 'dev', roleName: ROLE_NAME });

    expect(users).toEqual({ totalCount: roleUsers.length, data: roleUsers });
    expect(mockFindRole).toHaveBeenCalledWith({ realm: 'standard', id: 'client-uuid', roleName: ROLE_NAME });
    expect(fetchKeycloakRoleUsers).toHaveBeenCalledWith('dev', CLIENT_ID, ROLE_NAME, '', 5, 0);
  });

  it('passes the search key and pagination to grafana', async () => {
    await listRoleUsers(integration, {
      environment: 'test',
      roleName: ROLE_NAME,
      searchKey: 'guid-1',
      first: 10,
      max: 20,
    });

    expect(fetchKeycloakRoleUsers).toHaveBeenCalledWith('test', CLIENT_ID, ROLE_NAME, 'guid-1', 20, 10);
  });

  it('returns an empty result without querying grafana when the role does not exist', async () => {
    mockFindRole.mockResolvedValueOnce(null);

    const users = await listRoleUsers(integration, { environment: 'dev', roleName: 'missing-role' });

    expect(users).toEqual({ totalCount: 0, data: [] });
    expect(fetchKeycloakRoleUsers).not.toHaveBeenCalled();
  });

  it('returns an empty result without querying keycloak when the role name is too short', async () => {
    const users = await listRoleUsers(integration, { environment: 'dev', roleName: 'a' });

    expect(users).toEqual({ totalCount: 0, data: [] });
    expect(mockFindRole).not.toHaveBeenCalled();
    expect(fetchKeycloakRoleUsers).not.toHaveBeenCalled();
  });
});

describe('listRoleAssignedServiceAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindRole.mockResolvedValue({ name: ROLE_NAME });
    jest
      .mocked(fetchKeycloakRoleAssignedServiceAccounts)
      .mockResolvedValue({ totalCount: serviceAccounts.length, data: serviceAccounts });
  });

  it('returns the service accounts assigned to the role from grafana', async () => {
    const result = await listRoleAssignedServiceAccounts(integration, { environment: 'dev', roleName: ROLE_NAME });

    expect(result).toEqual({ totalCount: 1, data: serviceAccounts });
    expect(fetchKeycloakRoleAssignedServiceAccounts).toHaveBeenCalledWith('dev', CLIENT_ID, ROLE_NAME);
  });

  it('returns an empty result without querying grafana when the role does not exist', async () => {
    mockFindRole.mockResolvedValueOnce(null);

    const result = await listRoleAssignedServiceAccounts(integration, {
      environment: 'dev',
      roleName: 'missing-role',
    });

    expect(result).toEqual({ totalCount: 0, data: [] });
    expect(fetchKeycloakRoleAssignedServiceAccounts).not.toHaveBeenCalled();
  });
});
