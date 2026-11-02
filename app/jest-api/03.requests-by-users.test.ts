import createHttpError from 'http-errors';
import { Integration } from '@app/interfaces/Request';
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
import { createTeam, deleteTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { sendEmail } from '@app/utils/ches';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@app/shared/sequelize/models/models';
import { keycloakClient } from '@app/keycloak/integration';
import { resolveUserRoleMappingTarget } from '@app/keycloak/users';
import { validateIdirEmail } from '@app/utils/graph-api';
import { createMockAuth } from './mocks/authenticate';
import { testClient } from './helpers/test-client';
import userRolesHandler from '@app/pages/api/keycloak/user-roles';

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

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

const AZURE_FUZZY_SEARCH_RESPONSE = ['some.user@email.com'];
const AZURE_EMAIL_RESPONSE = {
  given_name: 'John',
  family_name: 'Doe',
};

jest.mock('@app/utils/graph-api', () => {
  return {
    searchIdirEmail: jest.fn(() => Promise.resolve(AZURE_FUZZY_SEARCH_RESPONSE)),
    validateIdirEmail: jest.fn(() => Promise.resolve(AZURE_EMAIL_RESPONSE)),
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
    bulkCreateRole: jest.fn(() =>
      Promise.resolve([
        {
          env: 'dev',
          success: ['role1', 'role2', 'role3'],
          duplicate: [],
        },
        {
          env: 'test',
          success: ['role2'],
          duplicate: [],
        },
        {
          env: 'prod',
          success: ['role3'],
          duplicate: [],
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
    // Every role a test names exists in Keycloak, and none exists yet for bulk creation.
    findClientRole: jest.fn(({}, { roleName }: { roleName: string }) => Promise.resolve({ name: roleName })),
    listClientRoles: jest.fn(() => Promise.resolve([])),
    createRole: jest.fn((_integration: any, { roleName }: { roleName: string }) => Promise.resolve({ roleName })),
    getCompositeClientRoles: jest.fn(() => Promise.resolve([])),
    resolveUserRoleMappingTarget: jest.fn(),
  };
});

describe('authentication', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
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
      const result = await getIntegration(integration?.id!);
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

    // A user whose roles live in memory: `current` is what Keycloak says they hold.
    const mockTarget = (current: string[], fail: string[] = []) => {
      const held = [...current];
      const change = jest.fn(async (roleName: string, mode: 'add' | 'remove') => {
        if (fail.includes(roleName)) throw new Error('keycloak down');
        if (mode === 'add') held.push(roleName);
        else held.splice(held.indexOf(roleName), 1);
      });
      (resolveUserRoleMappingTarget as jest.Mock).mockResolvedValue({
        current,
        change,
        listRoleNames: async () => [...held],
      });
      return change;
    };

    const putUserRoles = (body: object) =>
      testClient(userRolesHandler)
        .put('/api/keycloak/user-roles')
        .send({ environment: 'dev', integrationId: integration.id, ...body })
        .set('Accept', 'application/json');

    const roleEventsFor = async (username: string) =>
      (await getEventsByRequestId(integration.id!))
        .map((event: any) => event.get({ plain: true }))
        .filter((event: any) => event.targetId === username);

    it('records one operation per change, under a role-bulk-update parent, and drops changes that change nothing', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const change = mockTarget(['role-removed', 'role-kept']);

      const result = await putUserRoles({
        username: 'Bulk-User@IDIR',
        add: ['role-added', 'role-kept'],
        remove: ['role-removed', 'role-not-held'],
      });

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ roles: ['role-kept', 'role-added'], failed: { add: [], remove: [] } });
      expect(change.mock.calls).toEqual([
        ['role-added', 'add'],
        ['role-removed', 'remove'],
      ]);

      const events = await roleEventsFor('bulk-user@idir');
      expect(events.map((event: any) => [event.eventCode, event.outcome, event.details.roleName ?? null])).toEqual([
        ['role-bulk-update', 'requested', null],
        ['role-assign', 'requested', 'role-added'],
        ['role-unassign', 'requested', 'role-removed'],
        ['role-assign', 'success', 'role-added'],
        ['role-unassign', 'success', 'role-removed'],
        ['role-bulk-update', 'success', null],
      ]);
      const parent = events[0];
      expect(parent.details).toMatchObject({ add: ['role-added'], remove: ['role-removed'] });
      expect(events.slice(1, 5).every((event: any) => event.parentOperationId === parent.operationId)).toBe(true);
      expect(events.every((event: any) => event.targetType === 'user' && event.environment === 'dev')).toBe(true);
    });

    it('records a single change with no parent, as the api would', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      mockTarget(['single-role']);

      const result = await putUserRoles({ username: 'single-user@idir', remove: ['single-role'] });

      expect(result.status).toBe(200);
      const events = await roleEventsFor('single-user@idir');
      expect(events.map((event: any) => [event.eventCode, event.outcome, event.parentOperationId])).toEqual([
        ['role-unassign', 'requested', null],
        ['role-unassign', 'success', null],
      ]);
    });

    it('reports the changes that failed and records them as failures', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      mockTarget([], ['role-a']);

      const result = await putUserRoles({ username: 'down-user@idir', add: ['role-a', 'role-b'] });

      expect(result.status).toBe(200);
      expect(result.body).toEqual({ roles: ['role-b'], failed: { add: ['role-a'], remove: [] } });
      const outcomes = (await roleEventsFor('down-user@idir')).filter((event: any) => event.outcome !== 'requested');
      expect(outcomes.map((event: any) => [event.eventCode, event.details.roleName ?? null, event.outcome])).toEqual([
        ['role-assign', 'role-a', 'failure'],
        ['role-assign', 'role-b', 'success'],
        ['role-bulk-update', null, 'failure'],
      ]);
    });

    it('records nothing for a request that fails validation', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      (resolveUserRoleMappingTarget as jest.Mock).mockRejectedValue(
        new createHttpError.NotFound('role missing not found'),
      );

      const result = await putUserRoles({ username: 'nobody@idir', add: ['missing'] });

      expect(result.status).toBe(404);
      expect(await roleEventsFor('nobody@idir')).toEqual([]);
    });

    it('should fetch an integration by userId when a draft team integration has not selected a team yet', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let result = await createIntegration(getCreateIntegrationData({ projectName }));
      result = await updateIntegration(
        getUpdateIntegrationData({ integration: { ...result.body, usesTeam: true, teamId: null } }),
      );

      const retrieved = await getIntegrations();
      const foundIntegration = retrieved.body.find((integration: Integration) => integration.id === result.body.id);
      expect(foundIntegration).toBeTruthy();
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
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

describe('roles and restore integration', () => {
  let integration: Integration;
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

  it('should allow saving roles to database', async () => {
    await createBulkRoles({ integrationId: integration?.id!, roles: integrationRoles });
    const dbRoles = await models.requestRole.findAll({
      where: {
        requestId: integration.id,
      },
      raw: true,
    });

    expect(dbRoles.filter((role: any) => role.name === 'role1' && role.environment === 'dev')).toHaveLength(1);
    expect(dbRoles.filter((role: any) => role.name === 'role2' && role.environment === 'test')).toHaveLength(1);
    expect(dbRoles.filter((role: any) => role.name === 'role3' && role.environment === 'prod')).toHaveLength(1);
    expect(dbRoles.filter((role: any) => role.name === 'role2' && role.environment === 'test')).toHaveLength(1);
    expect(dbRoles.filter((role: any) => role.name === 'role3' && role.environment === 'prod')).toHaveLength(1);
  });

  it('should allow saving composite roles config for a role', async () => {
    await createCompositeRoles({
      integrationId: integration?.id!,
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
    const deleteIntRes = await deleteIntegration(integration.id!);
    expect(deleteIntRes.status).toEqual(200);
    const deleteResult = await getIntegration(integration.id!);
    expect(deleteResult.status).toEqual(200);
    expect(deleteResult.body.archived).toEqual(true);
    const restoreIntRes = await restoreIntegration(integration.id!, TEAM_ADMIN_IDIR_EMAIL_01);
    expect(restoreIntRes.status).toEqual(200);
    const restoreResult = await getIntegration(integration.id!);
    expect(restoreResult.status).toEqual(200);
    expect(restoreResult.body.archived).toEqual(false);

    const integrationEvents = await getEventsByRequestId(integration.id!);
    const restoreEvents = integrationEvents.filter((event: any) => event.eventCode === 'request-restore');
    expect(restoreEvents.map((event: any) => [event.outcome, event.actorType])).toEqual([
      ['requested', 'user'],
      ['success', 'system'],
    ]);
    expect(restoreEvents[0].operationId).toBe(restoreEvents[1].operationId);
  });

  it('logs a restore failed event if restoration fails', async () => {
    createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

    await deleteIntegration(integration.id!);

    (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
    await restoreIntegration(integration.id!, TEAM_ADMIN_IDIR_EMAIL_01);

    const integrationEvents = await getEventsByRequestId(integration.id!);
    const restoreFailures = integrationEvents.filter(
      (event: any) => event.eventCode === 'request-restore' && event.outcome === 'failure',
    );
    expect(restoreFailures.length).toBe(1);
  });
});

describe('Restoration User Assignment', () => {
  const MOCK_EMAIL = 'some@email.com';

  beforeAll(async () => {
    jest.clearAllMocks();
  });

  /**
   * Setup a created and deleted integration to test restoration.
   * @param withTeam Set true to make a team owned integration
   * @returns
   */
  const setupIntegrationForRestore = async (withTeam: boolean) => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
    let team: any;
    if (withTeam) {
      team = await createTeam({
        name: 'Team 1',
        members: [
          {
            idirEmail: TEAM_ADMIN_IDIR_EMAIL_01,
            role: 'admin',
          },
        ],
      }).then((res) => res.body);
    }
    const integration = await createIntegration(
      getCreateIntegrationData({
        projectName: 'Integration 1',
        teamIntegration: withTeam,
        teamId: withTeam ? team.id : null,
      }),
    ).then((res) => res.body);
    await updateIntegration(getUpdateIntegrationData({ integration }), true);
    await deleteIntegration(integration.id);
    return { integration, team };
  };

  it('Restores the integration to the same team if the team still exists', async () => {
    const { integration, team } = await setupIntegrationForRestore(true);
    await restoreIntegration(integration.id);
    const restoreResult = await getIntegration(integration.id).then((res) => res.body);

    expect(restoreResult.teamId).toEqual(team.id);
    expect(restoreResult.usesTeam).toEqual(true);
  });

  it('Restores the integration to the provided email if the team no longer exists', async () => {
    const { integration, team } = await setupIntegrationForRestore(true);
    await deleteTeam(team.id);
    const teamAdminUser = await models.user.findOne({ where: { idirEmail: TEAM_ADMIN_IDIR_EMAIL_01 } });

    await restoreIntegration(integration.id, TEAM_ADMIN_IDIR_EMAIL_01);
    const restoreResult = await getIntegration(integration.id).then((res) => res.body);

    expect(restoreResult.teamId).toBeNull();
    expect(restoreResult.usesTeam).toEqual(false);
    expect(restoreResult.requester).toEqual('SSO Admin');
    expect(restoreResult.idirUserDisplayName).toEqual('John Doe');
    expect(restoreResult.projectLead).toBe(true);
    expect(restoreResult.userId).toBe(teamAdminUser.id);
  });

  it('Creates a new user from the given email when restoring if not in the system', async () => {
    const { integration, team } = await setupIntegrationForRestore(true);
    await deleteIntegration(integration.id);
    await deleteTeam(team.id);

    // User does not exist before restore call
    let mockUser = await models.user.findOne({ where: { idirEmail: MOCK_EMAIL } });
    expect(mockUser).toBeNull();

    await restoreIntegration(integration.id, MOCK_EMAIL);

    // User created from AZURE_EMAIL_RESPONSE data
    mockUser = await models.user.findOne({ where: { idirEmail: MOCK_EMAIL } });
    expect(mockUser.displayName).toEqual('John Doe');

    const restoreResult = await getIntegration(integration.id).then((res) => res.body);

    // Integration details updated with new user
    expect(restoreResult.teamId).toBeNull();
    expect(restoreResult.usesTeam).toEqual(false);
    expect(restoreResult.requester).toEqual('SSO Admin');
    expect(restoreResult.projectLead).toBe(true);
    expect(restoreResult.idirUserDisplayName).toEqual('John Doe');
    expect(restoreResult.userId).toBe(mockUser.id);
  });

  it('Restores the integration to the provided email if the provided integration does not use a team', async () => {
    const { integration } = await setupIntegrationForRestore(false);

    // User does not exist before restore call
    let mockUser = await models.user.findOne({ where: { idirEmail: MOCK_EMAIL } });

    await restoreIntegration(integration.id, MOCK_EMAIL);

    // User created from AZURE_EMAIL_RESPONSE data
    mockUser = await models.user.findOne({ where: { idirEmail: MOCK_EMAIL } });
    expect(mockUser.displayName).toEqual('John Doe');

    const restoreResult = await getIntegration(integration.id).then((res) => res.body);

    // Integration details updated with new user
    expect(restoreResult.teamId).toBeNull();
    expect(restoreResult.usesTeam).toEqual(false);
    expect(restoreResult.requester).toEqual('SSO Admin');
    expect(restoreResult.projectLead).toBe(true);
    expect(restoreResult.idirUserDisplayName).toEqual('John Doe');
    expect(restoreResult.userId).toBe(mockUser.id);
  });

  it('Returns an error if the provided email is required but invalid and leaves the integration archived', async () => {
    const { integration } = await setupIntegrationForRestore(false);
    (validateIdirEmail as jest.Mock).mockImplementation(() => Promise.resolve(false));
    const restoreResponse = await restoreIntegration(integration.id, MOCK_EMAIL);
    expect(restoreResponse.status).toEqual(422);

    const restoreResult = await getIntegration(integration.id).then((res) => res.body);
    expect(restoreResult.archived).toBe(true);
  });

  it('Returns an error if the team is deleted but no email is provided', async () => {
    const { integration } = await setupIntegrationForRestore(true);

    await deleteIntegration(integration.id);
    await deleteTeam(integration.teamId);

    const restoreResponse = await restoreIntegration(integration.id);
    expect(restoreResponse.status).toEqual(422);
  });
});
