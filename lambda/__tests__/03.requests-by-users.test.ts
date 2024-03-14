import { Integration } from 'app/interfaces/Request';
import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
} from './helpers/fixtures';
import {
  createBulkRoles,
  createCompositeRoles,
  createIntegration,
  deleteIntegration,
  getEventsByRequestId,
  getIntegration,
  getIntegrations,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { sendEmail } from '@lambda-shared/utils/ches';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@lambda-shared/sequelize/models/models';
import { EVENTS } from '@lambda-shared/enums';
import { keycloakClient } from '../app/src/keycloak/integration';

const integrationRoles = [
  {
    name: 'role1',
    envs: ['dev'],
  },
  {
    name: 'role2',
    envs: ['dev'],
  },
  {
    name: 'role3',
    envs: ['dev'],
  },
  {
    name: 'role2',
    envs: ['test'],
  },
  {
    name: 'role3',
    envs: ['prod'],
  },
];

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('../app/src/utils/helpers', () => {
  const actual = jest.requireActual('../app/src/utils/helpers');
  return {
    ...actual,
    getUsersTeams: jest.fn(() => []),
  };
});

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../app/src/keycloak/users', () => {
  return {
    bulkCreateRole: jest.fn(() =>
      Promise.resolve([
        {
          env: 'dev',
          success: ['role1', 'role2', 'role3'],
        },
        {
          env: 'test',
          success: ['role2'],
        },
        {
          env: 'prod',
          success: ['role3'],
        },
      ]),
    ),
    setCompositeClientRoles: jest.fn(() =>
      Promise.resolve({
        name: 'role1',
        composites: ['role2', 'role3'],
      }),
    ),
    deleteRole: jest.fn(() => Promise.resolve()),
    findClientRole: jest.fn(() => Promise.resolve(null)),
  };
});

describe('authentication', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    it('should reject the requests without valid auth token', async () => {
      const result = await getIntegrations();
      expect(result.status).toEqual(401);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

describe('create/manage integration by authenticated user', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    const projectName: string = 'User Integration';

    let integration: Integration;

    it('should create integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createIntegration(getCreateIntegrationData({ projectName }));
      integration = result.body;
      expect(result.status).toEqual(200);
      expect(result.body.projectName).toEqual(projectName);
      expect(result.body.teamId).toBeNull;
    });

    it('should retrieve all the integrations', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegrations();
      expect(result.status).toEqual(200);
      expect(result.body.length).toBe(1);
    });

    it('should retrieve an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegration(integration.id);
      expect(result.status).toEqual(200);
      expect(result.body.id).toEqual(integration.id);
      expect(result.body.projectName).toEqual(projectName);
    });

    it('should update an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await updateIntegration(getUpdateIntegrationData({ integration }), true);
      expect(result.status).toEqual(200);
      expect(result.body.id).toEqual(integration.id);
      expect(sendEmail).toHaveBeenCalled();
    });

    it('Should not allow public service accounts', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const integrationClone = { ...integration };

      integrationClone.authType = 'service-account';
      integrationClone.publicAccess = true;
      let result = await updateIntegration(getUpdateIntegrationData({ integration: integrationClone }), true);
      expect(result.status).toEqual(422);

      integrationClone.authType = 'both';
      result = await updateIntegration(getUpdateIntegrationData({ integration: integrationClone }), true);
      expect(result.status).toEqual(422);

      // Public is okay if browser-login auth type
      integrationClone.authType = 'browser-login';
      result = await updateIntegration(getUpdateIntegrationData({ integration: integrationClone }), true);
      expect(result.status).toEqual(200);
    });

    it('should allow to create a successful saml integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

      const integrationRes = await buildIntegration({
        projectName: 'SAML Integration',
        prodEnv: true,
        submitted: true,
        protocol: 'saml',
      });

      expect(integrationRes.status).toEqual(200);
      const int = integrationRes.body;
      expect(int.status).toEqual('applied');
      expect(int.protocol).toEqual('saml');
    });

    it('should not allow to create a saml integration with multiple idps', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await createIntegration(
        getCreateIntegrationData({
          projectName: 'Invalid: Multiple idps',
        }),
      );

      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;

      let updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          integration,
          identityProviders: ['idir', 'azureidir', 'bceidbasic'],
          envs: ['dev', 'test', 'prod'],
          protocol: 'saml',
        }),
        true,
      );
      expect(updateIntegrationRes.status).toEqual(422);
    });

    it('should not allow to update project name of a saml integration in submitted state', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await createIntegration(
        getCreateIntegrationData({
          projectName: 'Project name at draft',
        }),
      );

      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      expect(integration.status).toEqual('draft');

      let updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          projectName: 'Project name before submit',
          integration,
          identityProviders: ['idir'],
          envs: ['dev', 'test', 'prod'],
          protocol: 'saml',
        }),
        true,
      );

      expect(updateIntegrationRes.status).toEqual(200);
      integration = updateIntegrationRes.body;
      expect(integration.status).toEqual('applied');

      const projNameAfterApplied = 'Project name after applied';

      updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          projectName: projNameAfterApplied,
          integration,
        }),
        true,
      );
      expect(updateIntegrationRes.status).toEqual(200);
      integration = updateIntegrationRes.body;
      expect(integration.projectName).not.toEqual(projNameAfterApplied);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

describe('roles and restore integration', () => {
  let integration;
  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: 'Roles and Restore',
      prodEnv: true,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('should allow saving roles to database', async () => {
    await createBulkRoles({ integrationId: integration.id, roles: integrationRoles });
    const dbRoles = await models.requestRole.findAll({
      where: {
        requestId: integration.id,
      },
      raw: true,
    });

    expect(dbRoles.filter((role) => role.name === 'role1' && role.environment === 'dev')).toHaveLength(1);
    expect(dbRoles.filter((role) => role.name === 'role2' && role.environment === 'test')).toHaveLength(1);
    expect(dbRoles.filter((role) => role.name === 'role3' && role.environment === 'prod')).toHaveLength(1);
    expect(dbRoles.filter((role) => role.name === 'role2' && role.environment === 'test')).toHaveLength(1);
    expect(dbRoles.filter((role) => role.name === 'role3' && role.environment === 'prod')).toHaveLength(1);
  });

  it('should allow saving composite roles config for a role', async () => {
    await createCompositeRoles({
      integrationId: integration.id,
      roleName: 'role1',
      environment: 'dev',
      compositeRoleNames: ['role2', 'role3'],
    });
    const dbRoles = await models.requestRole.findAll({
      where: {
        requestId: integration.id,
        name: 'role1',
        environment: 'dev',
      },
      raw: true,
    });

    expect(dbRoles).toHaveLength(1);
    expect(dbRoles[0].composite).toBeTruthy();
    expect(dbRoles[0].compositeRoles).toHaveLength(2);
  });
  it('should allow admin to delete and restore integration', async () => {
    createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
    const deleteIntRes = await deleteIntegration(integration.id);
    expect(deleteIntRes.status).toEqual(200);
    const deleteResult = await getIntegration(integration.id);
    expect(deleteResult.status).toEqual(200);
    expect(deleteResult.body.archived).toEqual(true);
    const restoreIntRes = await restoreIntegration(integration.id);
    expect(restoreIntRes.status).toEqual(200);
    const restoreResult = await getIntegration(integration.id);
    expect(restoreResult.status).toEqual(200);
    expect(restoreResult.body.archived).toEqual(false);

    const integrationEvents = await getEventsByRequestId(integration.id);
    const restoreEvents = integrationEvents.filter((event) => event.eventCode === EVENTS.REQUEST_RESTORE_SUCCESS);
    expect(restoreEvents.length).toBe(1);
  });

  it('logs a restore failed event if restoration fails', async () => {
    createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

    await deleteIntegration(integration.id);

    (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
    await restoreIntegration(integration.id);

    const integrationEvents = await getEventsByRequestId(integration.id);
    const restoreEvents = integrationEvents.filter((event) => event.eventCode === EVENTS.REQUEST_RESTORE_FAILURE);
    expect(restoreEvents.length).toBe(1);
  });
});
