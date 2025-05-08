import { Integration } from '@app/interfaces/Request';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { listClientCompositeRoles, listClientRoles, listClientRoleUsers } from './helpers/modules/roles';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './__mocks__/authenticate';

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

jest.mock('@app/keycloak/users', () => {
  return {
    listClientRoles: jest.fn(() =>
      Promise.resolve([
        { name: 'role1', clientRole: true, composite: false },
        { name: 'role2', clientRole: true, composite: false },
      ]),
    ),
    listRoleUsers: jest.fn(() =>
      Promise.resolve([
        {
          id: '11111111-1111-1111-1111-111111111111',
          enabled: true,
          username: 'user1',
          firstName: 'user1',
          lastName: 'user1',
          email: 'user1@example.com',
          attributes: {
            idir_user_guid: '11111111-1111-1111-1111-111111111111',
            idir_username: 'USER1',
            display_name: 'user1',
          },
        },
      ]),
    ),
    getCompositeClientRoles: jest.fn(() => Promise.resolve(['comp-role1', 'comp-role2'])),
  };
});

describe('SSO Admin', () => {
  let integration: Integration;
  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: 'SSO Admin Roles and Composites',
      prodEnv: true,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('should allow sso admin to list roles, composites, and role users for any integration', async () => {
    createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
    const rolesRes = await listClientRoles(integration.id!);
    expect(rolesRes.status).toEqual(200);
    expect(rolesRes.body[0].name).toEqual('role1');
    expect(rolesRes.body[1].name).toEqual('role2');

    const compositesRes = await listClientCompositeRoles(integration.id!, 'role1');
    expect(compositesRes.status).toEqual(200);
    expect(compositesRes.body[0]).toEqual('comp-role1');
    expect(compositesRes.body[1]).toEqual('comp-role2');

    const usersRes = await listClientRoleUsers(integration.id!, 'role1');
    expect(usersRes.status).toEqual(200);
    expect(usersRes.body[0].username).toEqual('user1');
  });
});
