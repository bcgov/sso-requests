import supertest from 'supertest';
import app from '@/tests/helpers/server';
import { KeycloakService } from '@/services/keycloak-service';
import { BceidWebserviceService } from '@/services/bceid-webservice';
import { seedApiAccount, seedIntergrations, seedTeamAndMembers } from './helpers/seeder';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from '@/tests/helpers/fixtures';
import models from '@/sequelize/models/models';

// Write routes the other suites reach only in ways that change nothing, exercised here so the audit
// coverage check (zz.audit-coverage.test.ts) sees each one record its action.

const API_BASE_PATH = '/api/v1';

// Where the logs route reads from; without them it fails before recording anything.
process.env.TRINO_RETENTION_SCHEMA = 'retention.schema';
process.env.TRINO_LIVE_SCHEMA = 'live.schema';
let team: any;
let apiAccount: any;
let integration: any;

jest.mock('@/modules/authenticate', () => ({
  authenticate: jest.fn(() =>
    Promise.resolve({ success: true, data: { teamId: team.id, apiClientId: apiAccount.clientId } as any, err: null }),
  ),
}));

jest.mock('@/modules/grafana', () => ({
  queryGrafana: jest.fn(() => Promise.resolve([JSON.stringify({ log: 'line' })])),
}));

// A user who holds nothing until a test grants them something.
const held = new Map<string, string[]>();
const heldBy = (username: string) => {
  if (!held.has(username)) held.set(username, []);
  return held.get(username)!;
};

const actions = async (where: Record<string, unknown>) =>
  (await models.event.findAll({ where, order: [['id', 'ASC']], raw: true })).map(
    (event: any) => `${event.eventCode}:${event.outcome}`,
  );

describe('audited api write routes', () => {
  beforeAll(async () => {
    team = await seedTeamAndMembers('api coverage team', [
      { idirUserId: TEAM_ADMIN_IDIR_USERID_01, email: TEAM_ADMIN_IDIR_EMAIL_01, role: 'admin' },
    ]);
    apiAccount = await seedApiAccount(team.id);
    integration = await seedIntergrations({
      integrationName: 'api coverage',
      idps: ['idir', 'bceidbasic'],
      teamId: team.id,
      submitted: true,
    });

    const spy = (method: keyof KeycloakService, impl: (...args: any[]) => any) =>
      jest.spyOn(KeycloakService.prototype, method as any).mockImplementation(impl as any);
    spy('setEnvironment', async () => undefined);
    spy('getClient', async () => ({ id: 'client-uuid' }));
    spy('getUser', async (username: string) => ({ id: `id-${username}`, username }));
    spy('listClientRoles', async () => [{ name: 'role1', composite: false }]);
    spy('listUsersByClientRole', async () => []);
    spy('listClientUserRoleMappings', async (_clientId: string, username: string) =>
      heldBy(username).map((name) => ({ name, composite: false })),
    );
    spy('addClientUserRoleMapping', async (_clientId: string, username: string, added: { name: string }[]) => {
      heldBy(username).push(...added.map(({ name }) => name));
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  const base = () => `${API_BASE_PATH}/integrations/${integration.id}/dev`;

  it('records a grant through the user-role-mappings route', async () => {
    await supertest(app)
      .post(`${base()}/user-role-mappings`)
      .send({ username: 'mapping-user@idir', roleName: 'role1', operation: 'add' })
      .expect(201);

    expect(await actions({ targetId: 'mapping-user@idir' })).toEqual(['role-assign:requested', 'role-assign:success']);
  });

  it('records a grant through the roles-new route to a user who already exists', async () => {
    const verify = jest.spyOn(BceidWebserviceService.prototype, 'verifyAccountByGuid');

    await supertest(app)
      .post(`${base()}/users/new-route-user@bceidbasic/roles-new`)
      .send([{ name: 'role1' }])
      .expect(201);

    expect(verify).not.toHaveBeenCalled();
    expect(await actions({ targetId: 'new-route-user@bceidbasic' })).toEqual([
      'role-assign:requested',
      'role-assign:success',
    ]);
  });

  it('records a logs download, as the app does', async () => {
    const response = await supertest(app).get(`${base()}/logs?start=2026-01-01&end=2026-01-02`).expect(200);

    expect(response.body.data).toEqual([{ log: 'line' }]);
    expect(await actions({ requestId: integration.id, eventCode: 'logs-download' })).toEqual([
      'logs-download:requested',
      'logs-download:success',
    ]);
  });
});
