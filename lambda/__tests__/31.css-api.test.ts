import app from './helpers/server';
import supertest from 'supertest';
import { authenticate } from '@lambda-app/authenticate';
import { TEST_IDIR_USERID, TEST_IDIR_EMAIL, AuthMock } from './00.db.test';
import { models } from '../shared/sequelize/models/models';
import { Integration } from './helpers/integration';

const BASE_PATH = '/api/v1';
const TEST_TOKEN = 'testtoken';
const integrationRoles = ['role1', 'role2', 'role3'];
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
const integrationUserRoles = ['role1'];
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
    createRole: jest.fn(() => Promise.resolve()),
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
    manageUserRole: jest.fn(() => Promise.resolve()),
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
    expect(result.body.success).toBe(true);
    expect(result.body.data.length).toBe(1);
  });

  it('gets team integration by id', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}`).expect(200);
    expect(result.body.success).toBe(true);
    expect(result.body.data.id).toBe(integration.int.id);
  });

  it('gets team integration roles by environment', async () => {
    const result = await supertest(app).get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles`).expect(200);
    expect(result.body.success).toBe(true);
    result.body.data.forEach((role) => {
      expect(integrationRoles).toContain(role.name);
    });
  });

  it('gets team integration role by environment and role name', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/${integrationRoles[0]}`)
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(integrationRoles[0]).toBe(result.body.data.name);
  });

  it('creates team integration role for an environment', async () => {
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles`)
      .send({ name: 'role4' })
      .set('Accept', 'application/json')
      .expect(201);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('created');
  });

  it('updates team integration role for an environment', async () => {
    const result = await supertest(app)
      .put(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role4`)
      .send({ name: 'role5' })
      .set('Accept', 'application/json')
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('updated');
  });

  it('deletes team integration role for an environment', async () => {
    const result = await supertest(app)
      .delete(`${BASE_PATH}/integrations/${integration.int.id}/dev/roles/role4`)
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('deleted');
  });

  it('fails fetching team integration role mappings for an environment when role name and username is not supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .expect(422);
    expect(result.body.success).toBe(false);
  });

  it('gets team integration role mappings for an environment when role name is supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .query({ roleName: integrationUserRoles[0] })
      .expect(200);

    expect(result.body.success).toBe(true);
    expect(result.body.data.roles.length === 1).toBe(true);
    expect(result.body.data.roles[0].name).toBe(integrationUserRoles[0]);
    expect(result.body.data.users.length === 1).toBe(true);
    expect(result.body.data.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.data.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.data.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.data.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.data.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('gets team integration role mappings for an environment when username is supplied', async () => {
    const result = await supertest(app)
      .get(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .query({ username: integrationRoleUsers[0].username })
      .expect(200);

    expect(result.body.success).toBe(true);
    expect(result.body.data.roles.length > 0).toBe(true);
    expect(result.body.data.roles[0].name).toBe(integrationUserRoles[0]);
    expect(result.body.data.users.length === 1).toBe(true);
    expect(result.body.data.users[0].username).toBe(integrationRoleUsers[0].username);
    expect(result.body.data.users[0].firstName).toBe(integrationRoleUsers[0].firstName);
    expect(result.body.data.users[0].lastName).toBe(integrationRoleUsers[0].lastName);
    expect(result.body.data.users[0].email).toBe(integrationRoleUsers[0].email);
    expect(result.body.data.users[0].attributes).toEqual(integrationRoleUsers[0].attributes);
  });

  it('creates team integration role mapping for an environment', async () => {
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .send({ username: integrationRoleUsers[0].username, roleName: 'role5', operation: 'add' })
      .set('Accept', 'application/json')
      .expect(201);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('created');
  });
  it('deletes team integration role mapping for an environment', async () => {
    const result = await supertest(app)
      .post(`${BASE_PATH}/integrations/${integration.int.id}/dev/user-role-mappings`)
      .send({ username: integrationRoleUsers[0].username, roleName: 'role5', operation: 'del' })
      .set('Accept', 'application/json')
      .expect(200);
    expect(result.body.success).toBe(true);
    expect(result.body.message).toBe('deleted');
  });
});
