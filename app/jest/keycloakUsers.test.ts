import { listRoleUsers } from '@app/keycloak/users';
import * as grafanaModule from '@app/utils/grafana';

const CLIENT_ID = 'client-1';
const ROLE_NAME = 'editor';

const roleUsers = [
  { id: 'kc-idir-user', username: 'guid-1@idir' },
  { id: 'kc-azureidir-user', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user', username: 'guid-3@bceidbasic' },
  { id: 'kc-service-account-user', username: 'service-account-client-1' },
  { id: 'kc-idir-user-2', username: 'guid-2@idir' },
  { id: 'kc-azureidir-user-2', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user-2', username: 'guid-3@bceidbasic' },
  { id: 'kc-idir-user-3', username: 'guid-1@idir' },
  { id: 'kc-azureidir-user-3', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user-3', username: 'guid-3@bceidbasic' },
  { id: 'kc-idir-user-4', username: 'guid-1@idir' },
  { id: 'kc-azureidir-user-4', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user-4', username: 'guid-3@bceidbasic' },
];

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: () =>
    Promise.resolve({
      kcAdminClient: {
        clients: {
          find: () => Promise.resolve([{ id: CLIENT_ID }]),
          findRole: () => Promise.resolve([{ name: ROLE_NAME }]),
          findUsersWithRole: () => Promise.resolve(roleUsers),
        },
      },
    }),
}));

const integration = { clientId: CLIENT_ID, devIdps: ['idir', 'azureidir', 'bceidbasic'] } as any;

describe('listRoleUsers', () => {
  it('only returns users whose idp is included in the integration devIdps', async () => {
    // users
    jest.spyOn(grafanaModule, 'fetchKeycloakRoleUsersCount').mockResolvedValueOnce(roleUsers.length - 1);

    const users = await listRoleUsers(integration, { environment: 'dev', roleName: ROLE_NAME });
    expect(users?.totalCount).toBe(roleUsers.length - 1);
    // expect to make sure all the usernames are present except service account users
    expect(users?.data?.map((user) => user.username)).toEqual([
      'guid-1@idir',
      'guid-2@azureidir',
      'guid-3@bceidbasic',
      'guid-2@idir',
      'guid-2@azureidir',
      'guid-3@bceidbasic',
      'guid-1@idir',
      'guid-2@azureidir',
      'guid-3@bceidbasic',
      'guid-1@idir',
      'guid-2@azureidir',
      'guid-3@bceidbasic',
    ]);

    // service account users
    jest.spyOn(grafanaModule, 'fetchKeycloakRoleUsersCount').mockResolvedValueOnce(1);
    const serviceAccountUsers = await listRoleUsers(integration, {
      environment: 'dev',
      roleName: ROLE_NAME,
      serviceAccount: true,
    });
    expect(serviceAccountUsers?.totalCount).toBe(1);
    expect(serviceAccountUsers?.data?.map((user) => user.username)).toEqual(['service-account-client-1']);
  });
});
