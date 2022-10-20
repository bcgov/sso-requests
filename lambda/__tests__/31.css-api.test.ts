import app from './helpers/server';
import supertest from 'supertest';
import { authenticate } from '@lambda-app/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';
import { models } from '../shared/sequelize/models/models';
import { Integration } from './helpers/integration';
import { findClientRole } from '@lambda-app/keycloak/users';

const BASE_PATH = '/api/v1';
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

const searchUsersByIdp = [
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
let integration = new Integration();

jest.mock('@lambda-app/authenticate');
jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
    closeOpenPullRequests: jest.fn(() => Promise.resolve()),
  };
});
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
    manageRoleComposites: jest.fn(() => {}),
    getRoleComposites: jest.fn(() => {
      return Promise.resolve([{ name: 'role2', composite: false }]);
    }),
    searchUsersByIdp: jest.fn(() => {
      return Promise.resolve({
        count: 1,
        rows: searchUsersByIdp,
      });
    }),
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

export type ApiAuthData = {
  teamId: number;
};

export type ApiAuthMock = Promise<{
  success: boolean;
  data: ApiAuthData;
  err: string | null;
}>;

const mockedAuthenticate = authenticate as jest.Mock<AuthMock>;

const mockedFindClientRole = findClientRole as jest.Mock<any>;

mockedAuthenticate.mockImplementation(() => {
  return Promise.resolve({
    idir_userid: TEST_IDIR_USERID,
    email: TEST_IDIR_EMAIL,
    client_roles: [],
    given_name: '',
    family_name: '',
  });
});

let teamRequest;

jest.mock('../css-api/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: integration.team.id },
        err: null,
      });
    }),
  };
});

describe('create team and gold integration', () => {
  let user;

  beforeAll(async () => {
    jest.clearAllMocks();
    user = await models.user.findOne({ where: { id: 1 } });
    teamRequest = await integration.create({ usesTeam: true, serviceType: 'gold' });
    integration.set({ devIdps: ['idir'], environments: ['dev', 'test', 'prod'], prodValidRedirectUris: ['https://a'] });
    await integration.submit();
    await integration.success();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('gets api heartbeat', async () => {
    await supertest(app).get(`${BASE_PATH}/heartbeat`).expect(200);
  });

  it('gets team integrations', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations`).expect(200);
    expect(result.body.data.length).toBe(1);
  });

  it('gets team integration by id', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}`).expect(200);
    expect(result.body.id).toBe(integration.int.id);
  });

  it('gets team integration roles by environment', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles`).expect(200);
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
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/${integrationRoles[0].name}`)
      .expect(200);
    expect(integrationRoles[0].name).toBe(result.body.name);
    expect(result.body.composite).toBe(false);
  });

  it('creates team integration role for an environment', async () => {
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve();
    });
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve({
        name: 'role4',
        composite: false,
      });
    });
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles`)
      .send({ name: createIntegrationRole })
      .set('Accept', 'application/json')
      .expect(201);
    expect(result.body.name).toBe(createIntegrationRole);
    expect(result.body.composite).toBe(false);
  });

  it('updates team integration role for an environment', async () => {
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve({
        name: 'role4',
        composite: false,
      });
    });
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve(undefined);
    });
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve({
        name: 'role5',
        composite: false,
      });
    });
    const result = await supertest(app)
      .put(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/${createIntegrationRole}`)
      .send({ name: updateIntegrationRole })
      .set('Accept', 'application/json')
      .expect(200);
    expect(result.body.name).toBe(updateIntegrationRole);
    expect(result.body.composite).toBe(false);
  });

  it('create composite role', async () => {
    mockedFindClientRole.mockImplementationOnce(() => {
      return Promise.resolve({
        name: 'role1',
        composite: true,
      });
    });

    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role1/composite-roles`)
      .send([{ name: 'role2' }])
      .set('Accept', 'application/json')
      .expect(200);

    expect(result.body.name).toBe('role1');
    expect(result.body.composite).toBe(true);
  });

  it('get role composites', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role1/composite-roles`)
      .expect(200);

    result.body.data.forEach((role) => {
      expect(role.name).toBe('role2');
      expect(role.composite).toBe(false);
    });
  });

  it('get role composite', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role1/composite-roles/role2`)
      .expect(200);

    expect(result.body.name).toBe('role2');
    expect(result.body.composite).toBe(false);
  });

  it('remove role composite', async () => {
    await supertest(app)
      .delete(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role1/composite-roles/role2`)
      .expect(204);
  });

  it('get users associated with idir', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/idir/users`)
      .query({
        firstName: searchUsersByIdp[0].firstName,
        lastName: searchUsersByIdp[0].lastName,
        email: searchUsersByIdp[0].email,
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('get users associated with azure idir', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/azure-idir/users`)
      .query({
        firstName: searchUsersByIdp[0].firstName,
        lastName: searchUsersByIdp[0].lastName,
        email: searchUsersByIdp[0].email,
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('get users associated with github', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/github-bcgov/users`)
      .query({
        firstName: searchUsersByIdp[0].firstName,
        lastName: searchUsersByIdp[0].lastName,
        email: searchUsersByIdp[0].email,
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('get users associated with basic bceid', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/basic-bceid/users`)
      .query({
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('get users associated with business bceid', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/business-bceid/users`)
      .query({
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('get users associated with basic or business', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/dev/basic-business-bceid/users`)
      .query({
        guid: searchUsersByIdp[0].username.split('@')[0],
      })
      .expect(200);
    expect(result.body.data[0].username).toBe(searchUsersByIdp[0].username);
    expect(result.body.data[0].firstName).toBe(searchUsersByIdp[0].firstName);
    expect(result.body.data[0].lastName).toBe(searchUsersByIdp[0].lastName);
    expect(result.body.data[0].email).toBe(searchUsersByIdp[0].email);
  });

  it('deletes team integration role for an environment', async () => {
    await supertest(app)
      .delete(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/${updateIntegrationRole}`)
      .expect(204);
  });

  it('fails fetching team integration role mappings for an environment when role name and username is not supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .expect(400);
  });

  it('fails fetching team integration role mappings for an environment when role name and username are not supplied', async () => {
    await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`).expect(400);
  });

  it('gets team integration role mappings for an environment when role name is supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .query({ roleName: integrationUserRoles[0].name })
      .expect(200);

    expect(result.body.roles.length === 1).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length === 1).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('gets team integration role mappings for an environment when username is supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .query({ username: integrationRoleUsers[0].username })
      .expect(200);

    expect(result.body.roles.length > 0).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length === 1).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('fails creating team integration role mapping for an environment when payload not supplied', async () => {
    await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('creates team integration role mapping for an environment', async () => {
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .send(createUserRoleMapping)
      .set('Accept', 'application/json')
      .expect(201);
    expect(result.body.roles.length > 0).toBe(true);
    expect(result.body.roles[0].name).toBe(integrationUserRoles[0].name);
    expect(result.body.roles[0].composite).toBe(integrationUserRoles[0].composite);
    expect(result.body.users.length === 1).toBe(true);
    expect(result.body.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });
  it('deletes team integration role mapping for an environment', async () => {
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .send(deleteUserRoleMapping)
      .set('Accept', 'application/json')
      .expect(204);
  });
});
