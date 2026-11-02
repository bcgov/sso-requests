import supertest from 'supertest';
import createHttpError from 'http-errors';
import app from '@/tests/helpers/server';
import { KeycloakService } from '@/services/keycloak-service';
import { seedApiAccount, seedIntergrations, seedTeamAndMembers } from './helpers/seeder';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from '@/tests/helpers/fixtures';
import models from '@/sequelize/models/models';
import { normalizeEventRows, ROLE_SCENARIO_ROWS } from '../../../packages/audit/test-support/matching';

// The api half of the app-vs-api check: the app's suite runs the same scenario through its own routes
// (app/jest-api/45.audit-matching.test.ts) and both assert the same normalized rows, so the two paths record
// the same change the same way.

const API_BASE_PATH = '/api/v1';
let team: any;
let apiAccount: any;
let integration: any;

jest.mock('@/modules/authenticate', () => ({
  authenticate: jest.fn(() =>
    Promise.resolve({ success: true, data: { teamId: team.id, apiClientId: apiAccount.clientId } as any, err: null }),
  ),
}));

// An in-memory Keycloak client: roles, their composites, and who holds which.
const roles = new Set<string>();
const composites = new Map<string, string[]>();
const held = new Map<string, string[]>();
const heldBy = (username: string) => {
  if (!held.has(username)) held.set(username, []);
  return held.get(username)!;
};

const mockKeycloak = () => {
  const spy = (method: keyof KeycloakService, impl: (...args: any[]) => any) =>
    jest.spyOn(KeycloakService.prototype, method as any).mockImplementation(impl as any);
  spy('setEnvironment', async () => undefined);
  spy('getClient', async () => ({ id: 'client-uuid' }));
  spy('getUser', async (username: string) => ({ id: `id-${username}`, username }));
  spy('getClientRole', async (_clientId: string, roleName: string) => {
    if (!roles.has(roleName)) throw new createHttpError.NotFound(`role ${roleName} not found`);
    return { name: roleName, composite: false };
  });
  spy('listClientRoles', async () => [...roles].map((name) => ({ name, composite: false })));
  spy('createClientRole', async (_clientId: string, role: { name: string }) => {
    roles.add(role.name);
    return { name: role.name, composite: false };
  });
  spy('deleteClientRole', async (_clientId: string, roleName: string) => roles.delete(roleName));
  spy('getCompositeRoles', async (_clientId: string, roleName: string) =>
    (composites.get(roleName) || []).map((name) => ({ name, composite: false })),
  );
  spy('createCompositeRole', async (_clientId: string, roleName: string, added: { name: string }[]) => {
    const list = composites.get(roleName) || [];
    composites.set(roleName, [...new Set([...list, ...added.map(({ name }) => name)])]);
    return { name: roleName, composite: true };
  });
  spy('listClientUserRoleMappings', async (_clientId: string, username: string) =>
    heldBy(username).map((name) => ({ name, composite: false })),
  );
  spy('addClientUserRoleMapping', async (_clientId: string, username: string, added: { name: string }[]) => {
    heldBy(username).push(...added.map(({ name }) => name));
  });
  spy('deleteClientUserRoleMapping', async (_clientId: string, username: string, roleName: string) => {
    const list = heldBy(username);
    list.splice(list.indexOf(roleName), 1);
  });
};

describe('app and api record role changes identically: the api half', () => {
  beforeAll(async () => {
    team = await seedTeamAndMembers('matching team', [
      { idirUserId: TEAM_ADMIN_IDIR_USERID_01, email: TEAM_ADMIN_IDIR_EMAIL_01, role: 'admin' },
    ]);
    apiAccount = await seedApiAccount(team.id);
    integration = await seedIntergrations({ integrationName: 'matching', teamId: team.id, submitted: true });
    mockKeycloak();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('records the shared role scenario as the expected rows', async () => {
    const base = `${API_BASE_PATH}/integrations/${integration.id}/dev`;
    const request = supertest(app);

    for (const name of ['matching-a', 'matching-b']) {
      await request.post(`${base}/roles`).send({ name }).expect(201);
    }
    await request
      .post(`${base}/roles/matching-a/composite-roles`)
      .send([{ name: 'matching-b' }])
      .expect(200);
    await request
      .post(`${base}/users/matching-user@idir/roles`)
      .send([{ name: 'matching-a' }])
      .expect(201);
    // A client id given as the username means that client's own service account.
    await request
      .post(`${base}/users/${integration.clientId}/roles`)
      .send([{ name: 'matching-a' }, { name: 'matching-b' }])
      .expect(201);
    await request.delete(`${base}/users/matching-user@idir/roles/matching-a`).expect(204);
    await request.delete(`${base}/roles/matching-b`).expect(204);

    const rows = await models.event.findAll({ where: { requestId: integration.id }, raw: true });
    const roleRows = rows.filter((row: any) => row.eventCode.startsWith('role-'));
    expect(
      normalizeEventRows(roleRows as any, {
        [`service-account-${integration.clientId}`.toLowerCase()]: 'SERVICE_ACCOUNT',
      }),
    ).toEqual(ROLE_SCENARIO_ROWS);
    // Attributed to the API account throughout.
    expect(
      roleRows.every((row: any) => row.actorType === 'service-account' && row.actorId === apiAccount.clientId),
    ).toBe(true);
  });
});
