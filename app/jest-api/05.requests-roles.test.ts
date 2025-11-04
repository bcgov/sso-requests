import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { createBulkRoles, createCompositeRoles, deleteRole } from './helpers/modules/integrations';
import { cleanUpDatabaseTables } from './helpers/utils';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@app/shared/sequelize/models/models';
import { Integration } from '@app/interfaces/Request';
import { createMockAuth } from './mocks/authenticate';

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

describe('roles and composites', () => {
  let integration: Integration;
  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: 'Roles and Composites',
      prodEnv: true,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
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

  it('should update the composite role if a role is removed from associated roles', async () => {
    await deleteRole({
      integrationId: integration?.id!,
      roleName: 'role3',
      environment: 'dev',
    });
    let dbRoles = await models.requestRole.findAll({
      where: {
        requestId: integration.id,
        name: 'role1',
        environment: 'dev',
      },
      raw: true,
    });

    expect(dbRoles).toHaveLength(1);
    expect(dbRoles[0].composite).toBeTruthy();
    expect(dbRoles[0].compositeRoles).toHaveLength(1);

    await deleteRole({
      integrationId: integration?.id!,
      roleName: 'role2',
      environment: 'dev',
    });
    dbRoles = await models.requestRole.findAll({
      where: {
        requestId: integration.id,
        name: 'role1',
        environment: 'dev',
      },
      raw: true,
    });

    expect(dbRoles).toHaveLength(1);
    expect(dbRoles[0].composite).not.toBeTruthy();
    expect(dbRoles[0].compositeRoles).toHaveLength(0);
  });
});
