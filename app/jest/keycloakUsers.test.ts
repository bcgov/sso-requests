import { listRoleUsers } from '@app/keycloak/users';
import * as grafanaModule from '@app/utils/grafana';

const CLIENT_ID = 'client-1';
const ROLE_NAME = 'editor';

const roleUsers = [
  { id: 'kc-idir-user', username: 'guid-1@idir' },
  { id: 'kc-azureidir-user', username: 'guid-2@azureidir' },
  { id: 'kc-bceid-user', username: 'guid-3@bceidbasic' },
];

jest.mock('@app/keycloak/adminClient', () => ({
  getAdminClient: () =>
    Promise.resolve({
      kcAdminClient: {
        clients: {
          find: () => Promise.resolve([{ id: CLIENT_ID }]),
          listRoles: () => Promise.resolve([{ name: ROLE_NAME }]),
          findUsersWithRole: () => Promise.resolve(roleUsers),
        },
      },
    }),
}));

const integration = { clientId: CLIENT_ID, devIdps: ['idir', 'azureidir'] } as any;

describe('listRoleUsers', () => {
  it('only returns users whose idp is included in the integration devIdps', async () => {
    jest.spyOn(grafanaModule, 'fetchKeycloakRoleUsersCount').mockResolvedValue(roleUsers.length);
    const users = await listRoleUsers(integration, { environment: 'dev', roleName: ROLE_NAME });

    expect(users?.data?.map((user) => user.username)).toEqual(['guid-1@idir', 'guid-2@azureidir']);
    expect(users?.data?.find((user) => user.username === 'guid-3@bceidbasic')).toBeUndefined();
    expect(users?.totalCount).toBe(roleUsers.length);
  });
});
