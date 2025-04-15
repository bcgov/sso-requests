import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, postTeam } from './helpers/fixtures';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { createTeam } from './helpers/modules/teams';
import supertest from 'supertest';
import app from './helpers/server';
import { API_BASE_PATH } from './helpers/constants';
import { buildIntegration } from './helpers/modules/common';
import { findClientRole } from '@lambda-app/keycloak/users';
import { KeycloakService } from '@lambda-css-api/services/keycloak-service';

let team;
let integration;
const TEST_TOKEN = 'testtoken';
const integrationRoles = [
  {
    name: 'role1',
    composite: false,
  },
  {
    name: 'role2',
    composite: false,
  },
  {
    name: 'role3',
    composite: false,
  },
];
const integrationRoleUsers = [
  {
    id: 'f1b2b019-b657-4854-961b-739469d16c88',
    createdTimestamp: 1661664154156,
    username: '08fe82212408466081ea023cf0ec945d@idir',
    enabled: true,
    email: 'BRTEST@gmail.com',
    totp: false,
    emailVerified: false,
    firstName: 'BRTEST',
    lastName: '2',
    attributes: {
      idir_userid: ['08FE82212408466081EA023CF0EC945D'],
      displayName: ['2, BRTEST'],
    },
    disableableCredentialTypes: [],
    requiredActions: [],
    notBefore: 0,
  },
];

const searchUsersByIdpRows = [
  {
    username: '1ef789deb11e4ba1ab11c0123a4560b0@idp',
    firstName: 'Test',
    lastName: 'User',
    email: 'test.user@gov.bc.ca',
  },
];

const createIntegrationRole = 'role4';
const updateIntegrationRole = 'role5';
const integrationUserRoles = [{ name: 'role1', composite: false }];
const createUserRoleMapping = {
  username: integrationRoleUsers[0].username,
  roleName: 'role1',
  operation: 'add',
};
const deleteUserRoleMapping = {
  username: integrationRoleUsers[0].username,
  roleName: 'role1',
  operation: 'del',
};

const mockedFindClientRole = findClientRole as jest.Mock<any>;

jest.mock('@lambda-app/keycloak/users', () => {
  return {
    listClientRoles: jest.fn(() => {
      return Promise.resolve(integrationRoles);
    }),
    createRole: jest.fn(() => Promise.resolve({ roleName: createIntegrationRole })),
    updateRole: jest.fn(() => Promise.resolve()),
    deleteRole: jest.fn(() => Promise.resolve()),
    listRoleUsers: jest.fn(() => {
      return Promise.resolve(integrationRoleUsers);
    }),
    listUserRoles: jest.fn(() => {
      return Promise.resolve(integrationUserRoles);
    }),
    findUserByRealm: jest.fn(() => {
      return Promise.resolve(integrationRoleUsers);
    }),
    findClientRole: jest.fn(),
    manageUserRole: jest.fn(() => Promise.resolve([{ name: 'role1', composite: false }])),
    getRoleComposites: jest.fn(() => {
      return Promise.resolve([{ name: 'role2', composite: false }]);
    }),
    searchUsersByIdp: jest.fn(() => {
      return Promise.resolve({
        count: 1,
        rows: searchUsersByIdpRows,
      });
    }),
    setCompositeClientRoles: jest.fn(() => Promise.resolve({ name: 'role1', composites: ['role2'] })),
  };
});
jest.mock('@lambda-app/helpers/token', () => {
  const actual = jest.requireActual('@lambda-app/helpers/token');
  return {
    ...actual,
    generateInvitationToken: jest.fn(() => TEST_TOKEN),
  };
});

jest.mock('@lambda-app/authenticate');

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@lambda-app/helpers/token', () => {
  const actual = jest.requireActual('@lambda-app/helpers/token');
  return {
    ...actual,
    generateInvitationToken: jest.fn(() => TEST_TOKEN),
  };
});
jest.mock('@lambda-shared/utils/ches');

jest.mock('@lambda-css-api/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: team.id },
        err: null,
      });
    }),
  };
});

const createIntegrationRoles = async (roleName: string, intId: number, env: string) => {
  return await supertest(app)
    .post(`${API_BASE_PATH}/integrations/${intId}/dev/roles`)
    .send({ name: roleName })
    .set('Accept', 'application/json');
};

describe('emails for teams', () => {
  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const result = await createTeam(postTeam);
    expect(result.status).toEqual(200);
    team = result.body;
    const integrationRes = await buildIntegration({
      projectName: 'TEST CSS API',
      prodEnv: true,
      submitted: true,
      teamId: team.id,
    });
    integration = integrationRes.body;

    ['role1', 'role2', 'role3'].forEach(async (role) => {
      jest.spyOn(KeycloakService.prototype, 'createClientRole').mockImplementationOnce(() => {
        return Promise.resolve({ name: role, composite: false });
      });
      await createIntegrationRoles(role, integration.id, 'dev');
    });

    jest.spyOn(KeycloakService.prototype, 'getUsers').mockImplementation(() => {
      return Promise.resolve(searchUsersByIdpRows);
    });
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('gets api heartbeat', async () => {
    await supertest(app).get(`${API_BASE_PATH}/heartbeat`).expect(200);
  });

  it('gets team integrations', async () => {
    const result = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
    expect(result.body.data.length).toBe(1);
  });

  it('gets team integrations', async () => {
    const result = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);
    expect(result.body.data.length).toBe(1);
  });

  it('gets team integration by id', async () => {
    const result = await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}`).expect(200);
    expect(result.body.id).toBe(integration.id);
  });

  it('gets team integration roles by environment', async () => {
    const result = await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles`).expect(200);
    const roles = integrationRoles.map((role) => role.name);
    result.body.data.forEach((role) => {
      expect(roles).toContain(role.name);
      expect(role.composite).toBe(false);
    });
  });

  it('gets team integration role by environment and role name', async () => {
    mockedFindClientRole.mockImplementation(() => {
      return Promise.resolve({
        name: 'role1',
        composite: false,
      });
    });

    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/${integrationRoles[0].name}`)
      .expect(200);
    expect(integrationRoles[0].name).toBe(result.body.name);
    expect(result.body.composite).toBe(false);
  });

  it('creates team integration role for an environment', async () => {
    const createClientRoleMock = jest.spyOn(KeycloakService.prototype, 'createClientRole').mockImplementation(() => {
      return Promise.resolve({ name: createIntegrationRole, composite: false });
    });
    const result = await createIntegrationRoles(createIntegrationRole, integration.id, 'dev');
    expect(createClientRoleMock).toHaveBeenCalled();
    expect(result.body.name).toBe(createIntegrationRole);
    expect(result.body.composite).toBe(false);
  });

  it('updates team integration role for an environment', async () => {
    const updateClientRoleMock = jest.spyOn(KeycloakService.prototype, 'updateClientRole').mockImplementation(() => {
      return Promise.resolve({ name: 'role5', composite: false });
    });
    const result = await supertest(app)
      .put(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/${createIntegrationRole}`)
      .send({ name: updateIntegrationRole })
      .set('Accept', 'application/json')
      .expect(200);

    expect(updateClientRoleMock).toHaveBeenCalled();
    expect(result.body.name).toBe(updateIntegrationRole);
    expect(result.body.composite).toBe(false);
  });

  it('create composite role', async () => {
    const createCompositeRoleMock = jest
      .spyOn(KeycloakService.prototype, 'createCompositeRole')
      .mockImplementation(() => {
        return Promise.resolve({ name: 'role1', composite: true });
      });

    const result = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/role1/composite-roles`)
      .send([{ name: 'role2' }])
      .set('Accept', 'application/json')
      .expect(200);

    expect(createCompositeRoleMock).toHaveBeenCalled();
    expect(result.body.name).toBe('role1');
    expect(result.body.composite).toBe(true);
  });

  it('get role composites', async () => {
    const getCompositeRolesMock = jest.spyOn(KeycloakService.prototype, 'getCompositeRoles').mockImplementation(() => {
      return Promise.resolve([{ name: 'role2', composite: false }]);
    });
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/role1/composite-roles`)
      .expect(200);

    expect(getCompositeRolesMock).toHaveBeenCalled();
    result.body.data.forEach((role) => {
      expect(role.name).toBe('role2');
      expect(role.composite).toBe(false);
    });
  });

  it('get role composite', async () => {
    const getCompositeRoleMock = jest.spyOn(KeycloakService.prototype, 'getCompositeRoles').mockImplementation(() => {
      return Promise.resolve({ name: 'role2', composite: false });
    });
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/role1/composite-roles/role2`)
      .expect(200);

    expect(getCompositeRoleMock).toHaveBeenCalled();
    expect(result.body.name).toBe('role2');
    expect(result.body.composite).toBe(false);
  });

  it('remove role composite', async () => {
    jest.spyOn(KeycloakService.prototype, 'deleteCompositeRole').mockImplementation();
    await supertest(app)
      .delete(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/role1/composite-roles/role2`)
      .expect(204);
  });

  it('get users associated with idir', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/idir/users`)
      .query({
        firstName: searchUsersByIdpRows[0].firstName,
        lastName: searchUsersByIdpRows[0].lastName,
        email: searchUsersByIdpRows[0].email,
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with azure idir', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/azure-idir/users`)
      .query({
        firstName: searchUsersByIdpRows[0].firstName,
        lastName: searchUsersByIdpRows[0].lastName,
        email: searchUsersByIdpRows[0].email,
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with github bcgov', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/github-bcgov/users`)
      .query({
        name: searchUsersByIdpRows[0].firstName,
        login: searchUsersByIdpRows[0].lastName,
        email: searchUsersByIdpRows[0].email,
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe('');
    expect(result.body.data[0].lastName).toBe('');
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with github public', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/github-public/users`)
      .query({
        name: searchUsersByIdpRows[0].firstName,
        login: searchUsersByIdpRows[0].lastName,
        email: searchUsersByIdpRows[0].email,
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe('');
    expect(result.body.data[0].lastName).toBe('');
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with basic bceid', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/basic-bceid/users`)
      .query({
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with business bceid', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/business-bceid/users`)
      .query({
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('get users associated with basic or business', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/dev/basic-business-bceid/users`)
      .query({
        guid: searchUsersByIdpRows[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('gets bceid users associated with integration', async () => {
    jest.spyOn(KeycloakService.prototype, 'getUserRealmRoles').mockImplementation(() => {
      return Promise.resolve([{ name: `client-${integration.clientId}` }]);
    });
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/bceid/users`)
      .query({
        bceidType: 'basic',
        guid: searchUsersByIdpRows[0].username.split('@')[0],
        email: searchUsersByIdpRows[0].email,
        displayName: searchUsersByIdpRows[0].firstName,
        username: searchUsersByIdpRows[0].lastName,
      })
      .expect(200);

    expect(result.body.data[0].username).toBe(searchUsersByIdpRows[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdpRows[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdpRows[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdpRows[0].email);
  });

  it('deletes team integration role for an environment', async () => {
    jest.spyOn(KeycloakService.prototype, 'deleteClientRole').mockImplementation();
    await supertest(app)
      .delete(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/${updateIntegrationRole}`)
      .expect(204);
  });

  it('fails fetching team integration role mappings for an environment when role name and username is not supplied', async () => {
    await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`).expect(400);
  });

  it('fails fetching team integration role mappings for an environment when role name and username are not supplied', async () => {
    await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`).expect(400);
  });

  it('gets team integration role mappings for an environment when role name is supplied', async () => {
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`)
      .query({ roleName: integrationUserRoles[0].name })
      .expect(200);

    expect(result.body.roles.length > 0).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length > 0).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('gets team integration role mappings for an environment when username is supplied', async () => {
    const listClientUserRoleMappingsMock = jest
      .spyOn(KeycloakService.prototype, 'listClientUserRoleMappings')
      .mockImplementation(() => Promise.resolve(integrationUserRoles));
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`)
      .query({ username: integrationRoleUsers[0].username })
      .expect(200);

    expect(listClientUserRoleMappingsMock).toHaveBeenCalled();
    expect(result.body.roles.length > 0).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length > 0).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('fails creating team integration role mapping for an environment when payload not supplied', async () => {
    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`)
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('creates team integration role mapping for an environment', async () => {
    const result = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`)
      .send(createUserRoleMapping)
      .set('Accept', 'application/json')
      .expect(201);
    expect(result.body.roles.length > 0).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length > 0).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('deletes team integration role mapping for an environment', async () => {
    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/user-role-mappings`)
      .send(deleteUserRoleMapping)
      .set('Accept', 'application/json')
      .expect(204);
  });

  it('gets roles associated with user for an environment when username is supplied', async () => {
    const listClientUserRoleMappingsMock = jest
      .spyOn(KeycloakService.prototype, 'listClientUserRoleMappings')
      .mockImplementation(() => Promise.resolve(integrationUserRoles));
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${createUserRoleMapping.username}/roles`)
      .expect(200);

    expect(listClientUserRoleMappingsMock).toHaveBeenCalled();
    expect(result.body.data.length > 0).toBe(true);
    expect(result.body.data[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.data[0].composite).toBe(integrationUserRoles[0].composite);
  });

  it('gets roles associated with a service account for an environment when the client id is supplied as username', async () => {
    const listClientUserRoleMappingsMock = jest
      .spyOn(KeycloakService.prototype, 'listClientUserRoleMappings')
      .mockImplementation(() => Promise.resolve(integrationUserRoles));
    await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${integration.clientId}/roles`)
      .expect(200);

    expect(listClientUserRoleMappingsMock).toHaveBeenCalledWith(
      integration.clientId,
      `service-account-${integration.clientId}`,
    );
  });

  it('gets users associated to a role per page for an environment when roleName is supplied', async () => {
    const listUsersByClientRoleMock = jest
      .spyOn(KeycloakService.prototype, 'listUsersByClientRole')
      .mockImplementation(() => Promise.resolve(integrationRoleUsers));
    const result = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integration.id}/dev/roles/${integrationUserRoles[0].name}/users`)
      .expect(200);

    expect(listUsersByClientRoleMock).toHaveBeenCalled();
    expect(result.body.data.length > 0).toBe(true);
    expect(result.body.page).toBe(1);
    expect(result.body.data[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.data[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.data[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.data[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.data[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('assign a role to an user for an environment', async () => {
    const addClientUserRoleMappingMock = jest
      .spyOn(KeycloakService.prototype, 'addClientUserRoleMapping')
      .mockImplementation(() => Promise.resolve([{ name: 'role1', composite: false }]));
    const result = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${createUserRoleMapping.username}/roles`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(201);

    expect(addClientUserRoleMappingMock).toHaveBeenCalled();
    expect(result.body.data.length > 0).toBe(true);
    expect(result.body.data[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.data[0].composite).toBe(integrationUserRoles[0].composite);
  });

  it('Remaps client id to service account username on role assignment', async () => {
    const addClientUserRoleMappingMock = jest
      .spyOn(KeycloakService.prototype, 'addClientUserRoleMapping')
      .mockImplementation(() => Promise.resolve([{ name: 'role1', composite: false }]));
    await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${integration.clientId}/roles`)
      .send([{ name: 'role1' }])
      .set('Accept', 'application/json')
      .expect(201);

    expect(addClientUserRoleMappingMock).toHaveBeenCalledWith(
      integration.clientId,
      `service-account-${integration.clientId}`,
      [{ name: 'role1' }],
    );
  });

  it('unassign a role to an user for an environment', async () => {
    const deleteClientUserRoleMappingMock = jest
      .spyOn(KeycloakService.prototype, 'deleteClientUserRoleMapping')
      .mockImplementation(() => Promise.resolve(null));
    const result = await supertest(app)
      .delete(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${createUserRoleMapping.username}/roles/role1`)
      .expect(204);
    expect(deleteClientUserRoleMappingMock).toHaveBeenCalled();
    expect(result.body).toBeNull;
  });

  it('Remaps the client ID to the service account name on deletes', async () => {
    const deleteClientUserRoleMappingMock = jest
      .spyOn(KeycloakService.prototype, 'deleteClientUserRoleMapping')
      .mockImplementation(() => Promise.resolve(null));

    await supertest(app)
      .delete(`${API_BASE_PATH}/integrations/${integration.id}/dev/users/${integration.clientId}/roles/role1`)
      .expect(204);

    expect(deleteClientUserRoleMappingMock).toHaveBeenCalledWith(
      integration.clientId,
      `service-account-${integration.clientId}`,
      'role1',
    );
  });
});
