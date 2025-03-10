import app from './helpers/server';
import supertest from 'supertest';
import { API_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables } from './helpers/utils';
import { getUpdateIntegrationData } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';
import { KeycloakService } from '@lambda-css-api/services/keycloak-service';
import { RoleService } from '@lambda-css-api/services/role-service';
import { UserRoleMappingService } from '@lambda-css-api/services/user-role-mapping-service';

jest.mock('../app/src/grafana', () => {
  return {
    queryGrafana: jest.fn(() => Promise.resolve(['{"log": "log"}', '{"log": "log"}'])),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

const AUTHENTICATED_TEAM_ID = 1;
const UNAUTHENTICATED_TEAM_ID = 2;
const teamAuthResponse = {
  success: true,
  data: {
    teamId: AUTHENTICATED_TEAM_ID,
  },
};

jest.mock('@lambda-css-api/authenticate', () => ({
  authenticate: jest.fn(() => Promise.resolve(teamAuthResponse)),
}));

const MOCK_USER_ID = -1;
const MOCK_USER_EMAIL = 'test@user.com';
const INTEGRATION_ID = -1;
const integration = getUpdateIntegrationData({ integration: { projectName: 'test_project' } });

// Create integration owned by mock user to test against
const setupIntegrationAndUser = async () => {
  await models.user.create({
    id: MOCK_USER_ID,
    idirEmail: MOCK_USER_EMAIL,
  });
  await models.request.create({
    ...integration,
    id: INTEGRATION_ID,
    usesTeam: false,
    userId: MOCK_USER_ID,
  });
};

describe('CSS API - Edit and delete roles', () => {
  const integration = getUpdateIntegrationData({ integration: { projectName: 'test_project' } });

  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  const createTeamOwnedIntegration = async (teamId: number) => {
    await models.team.create({
      id: teamId,
      name: 'test_team',
    });
    const createdIntegration = await models.request.create({
      ...integration,
      usesTeam: true,
      teamId,
    });
    return createdIntegration.id;
  };

  it('is able to query a role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);

    const findClientRoleMock = jest.spyOn(RoleService.prototype, 'getByName').mockImplementation(() => {
      return Promise.resolve({ name: createIntegrationRole, composite: false });
    });

    const response = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    // expect method to be called with decoded url
    expect(findClientRoleMock).toBeCalledWith(1, integrationId.toString(), environment, createIntegrationRole);
  });

  it('is able to modify a role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const updatedIntegrationRole = 'role/two';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const updatePayload = { name: updatedIntegrationRole };

    const updateClientRoleMock = jest.spyOn(KeycloakService.prototype, 'updateClientRole').mockImplementation(() => {
      return Promise.resolve({ name: createIntegrationRole, composite: false });
    });

    const response = await supertest(app)
      .put(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}`)
      .send(updatePayload)
      .set('Accept', 'application/json')
      .expect(200);

    // expect method to be called with decoded url
    expect(updateClientRoleMock).toBeCalledWith(null, createIntegrationRole, updatePayload);
  });

  it('is able to delete a role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);

    const deleteClientRoleMock = jest.spyOn(KeycloakService.prototype, 'deleteClientRole').mockImplementation(() => {
      return Promise.resolve();
    });

    const response = await supertest(app)
      .delete(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}`)
      .set('Accept', 'application/json')
      .expect(204);

    // expect method to be called with decoded url
    expect(deleteClientRoleMock).toBeCalledWith(null, createIntegrationRole);
  });

  it('is able to get composite roles by searching by role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';

    const findCompositeRoleMock = jest.spyOn(RoleService.prototype, 'getCompositeRoles').mockImplementation(() => {
      return Promise.resolve([{ name: compositeRoleName, composite: true }]);
    });

    const response = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}/composite-roles`)
      .set('Accept', 'application/json')
      .expect(200);

    // expect method to be called with decoded url
    expect(findCompositeRoleMock).toBeCalledWith(1, integrationId.toString(), createIntegrationRole, environment);
  });

  it('is able to get single composite roles by searching by role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';
    const encodedCompositeRoleName = encodeURIComponent(compositeRoleName);

    const findCompositeRoleMock = jest.spyOn(RoleService.prototype, 'getCompositeRole').mockImplementation(() => {
      return Promise.resolve({ name: compositeRoleName, composite: true });
    });

    const response = await supertest(app)
      .get(
        `${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}/composite-roles/${encodedCompositeRoleName}`,
      )
      .set('Accept', 'application/json')
      .expect(200);

    // expect method to be called with decoded url
    expect(findCompositeRoleMock).toBeCalledWith(
      1,
      integrationId.toString(),
      createIntegrationRole,
      environment,
      compositeRoleName,
    );
  });

  it('is able to create a composite role associated with a role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';
    const encodedCompositeRoleName = encodeURIComponent(compositeRoleName);

    const createCompositeRoleMock = jest.spyOn(RoleService.prototype, 'createCompositeRole').mockImplementation(() => {
      return Promise.resolve({ name: compositeRoleName, composite: true });
    });

    const response = await supertest(app)
      .post(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}/composite-roles`)
      .set('Accept', 'application/json')
      .expect(200);

    // expect method to be called with decoded url
    expect(createCompositeRoleMock).toBeCalledWith(1, integrationId.toString(), createIntegrationRole, environment, {});
  });

  it('is able to delete single composite roles by searching by role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';
    const encodedCompositeRoleName = encodeURIComponent(compositeRoleName);

    const deleteCompositeRoleMock = jest.spyOn(RoleService.prototype, 'deleteCompositeRole').mockImplementation(() => {
      return Promise.resolve();
    });

    const response = await supertest(app)
      .delete(
        `${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}/composite-roles/${encodedCompositeRoleName}`,
      )
      .set('Accept', 'application/json')
      .expect(204);

    // expect method to be called with decoded url
    expect(deleteCompositeRoleMock).toBeCalledWith(
      1,
      integrationId.toString(),
      createIntegrationRole,
      environment,
      compositeRoleName,
    );
  });

  it('is able to get the users associate with a role name with special characters in it', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';
    const encodedCompositeRoleName = encodeURIComponent(compositeRoleName);

    const listUsersByRolenameMock = jest
      .spyOn(UserRoleMappingService.prototype, 'listUsersByRolename')
      .mockImplementation(() => {
        return Promise.resolve({
          page: 1,
          data: [{ username: 'test', email: 'email', firstName: 'firsto', lastName: 'lasto', attributes: {} }],
        });
      });

    const response = await supertest(app)
      .get(`${API_BASE_PATH}/integrations/${integrationId}/${environment}/roles/${encodedRoleName}/users`)
      .set('Accept', 'application/json')
      .expect(200);

    // expect method to be called with decoded url
    expect(listUsersByRolenameMock).toBeCalledWith(
      1,
      integrationId.toString(),
      environment,
      createIntegrationRole,
      undefined,
      undefined,
    );
  });

  it('is able to delete a role from user with a  special char rolename', async () => {
    const integrationId = await createTeamOwnedIntegration(AUTHENTICATED_TEAM_ID);
    jest.spyOn(KeycloakService.prototype, 'setEnvironment').mockImplementation(() => {
      return Promise.resolve();
    });

    const environment = 'dev';
    const createIntegrationRole = 'role/one';
    const encodedRoleName = encodeURIComponent(createIntegrationRole);
    const compositeRoleName = 'role/composite/one';
    const username = 'steve';
    const deleteRoleFromUserMock = jest
      .spyOn(UserRoleMappingService.prototype, 'deleteRoleFromUser')
      .mockImplementation(() => {
        return Promise.resolve();
      });

    const response = await supertest(app)
      .delete(
        `${API_BASE_PATH}/integrations/${integrationId}/${environment}/users/${username}/roles/${encodedRoleName}`,
      )
      .set('Accept', 'application/json')
      .expect(204);

    // expect method to be called with decoded url
    expect(deleteRoleFromUserMock).toBeCalledWith(
      1,
      integrationId.toString(),
      environment,
      username,
      createIntegrationRole,
    );
  });
});
