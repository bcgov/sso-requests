import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { createCompositeRoles, deleteRole } from './helpers/modules/integrations';
import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import rolesHandler from '@app/pages/api/keycloak/roles';
import userRolesHandler from '@app/pages/api/keycloak/user-roles';
import { normalizeEventRows, ROLE_SCENARIO_ROWS } from '../../packages/audit/test-support/matching';

// The app half of the app-vs-api check: the api's suite runs the same scenario through its own routes
// (api/src/tests/audit-matching.test.ts) and both assert the same normalized rows, so the two paths record
// the same change the same way.

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return { ...original, keycloakClient: jest.fn(() => Promise.resolve(true)) };
});

// An in-memory Keycloak client: roles, their composites, and who holds which.
const mockKeycloak = {
  roles: new Set<string>(),
  composites: new Map<string, string[]>(),
  held: new Map<string, string[]>(),
};

jest.mock('@app/keycloak/users', () => ({
  ...jest.requireActual('@app/keycloak/users'),
  findClientRole: jest.fn(async (_integration: any, { roleName }: any) =>
    mockKeycloak.roles.has(roleName) ? { name: roleName } : null,
  ),
  createRole: jest.fn(async (_integration: any, { roleName }: any) => {
    mockKeycloak.roles.add(roleName);
    return { name: roleName };
  }),
  deleteRole: jest.fn(async (_integration: any, { roleName }: any) => mockKeycloak.roles.delete(roleName)),
  getCompositeClientRoles: jest.fn(
    async (_integration: any, { roleName }: any) => mockKeycloak.composites.get(roleName) || [],
  ),
  setCompositeClientRoles: jest.fn(async (_integration: any, { roleName, compositeRoleNames }: any) => {
    mockKeycloak.composites.set(roleName, compositeRoleNames);
    return { name: roleName, composites: compositeRoleNames };
  }),
  resolveUserRoleMappingTarget: jest.fn(async (_integration: any, { username }: any) => {
    const held = mockKeycloak.held.get(username) || [];
    mockKeycloak.held.set(username, held);
    return {
      current: [...held],
      listRoleNames: async () => [...held],
      change: async (roleName: string, mode: 'add' | 'remove') => {
        if (mode === 'add') held.push(roleName);
        else held.splice(held.indexOf(roleName), 1);
      },
    };
  }),
}));

const putUserRoles = (integrationId: number, body: object) =>
  testClient(userRolesHandler)
    .put(`${API_BASE_PATH}/keycloak/user-roles`)
    .send({ environment: 'dev', integrationId, ...body });

describe('app and api record role changes identically: the app half', () => {
  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('records the shared role scenario as the expected rows', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integration = (await buildIntegration({ projectName: 'matching', submitted: true })).body;
    const id = integration.id;

    for (const roleName of ['matching-a', 'matching-b']) {
      const created = await testClient(rolesHandler)
        .put(`${API_BASE_PATH}/keycloak/roles`)
        .send({ integrationId: id, environment: 'dev', roleName });
      expect(created.status).toBe(200);
    }
    expect(
      (
        await createCompositeRoles({
          integrationId: id,
          environment: 'dev',
          roleName: 'matching-a',
          compositeRoleNames: ['matching-b'],
        })
      ).status,
    ).toBe(200);
    expect((await putUserRoles(id, { username: 'matching-user@idir', add: ['matching-a'] })).status).toBe(200);
    expect(
      (
        await putUserRoles(id, {
          username: `service-account-${integration.clientId}`,
          add: ['matching-a', 'matching-b'],
        })
      ).status,
    ).toBe(200);
    expect((await putUserRoles(id, { username: 'matching-user@idir', remove: ['matching-a'] })).status).toBe(200);
    expect((await deleteRole({ integrationId: id, environment: 'dev', roleName: 'matching-b' })).status).toBe(200);

    const rows = await models.event.findAll({ where: { requestId: id }, raw: true });
    const roleRows = rows.filter((row: any) => row.eventCode.startsWith('role-'));
    expect(
      normalizeEventRows(roleRows, { [`service-account-${integration.clientId}`.toLowerCase()]: 'SERVICE_ACCOUNT' }),
    ).toEqual(ROLE_SCENARIO_ROWS);
  });
});
