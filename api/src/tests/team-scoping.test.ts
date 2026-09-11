import supertest from 'supertest';
import app from '@/tests/helpers/server';
import * as authenticateModule from '@/modules/authenticate';
import { seedTeamAndMembers, seedIntergrations } from './helpers/seeder';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';

const API_BASE_PATH = '/api/v1';

/**
 * Characterization tests for the CSS API's authorization on `dev`, recorded before the
 * authorization rewrite begins.
 *
 * The whole of it is one rule: the team id carried by the service-account token scopes every
 * lookup, and a row outside that scope is indistinguishable from a row that does not exist. There
 * is no role, no permission and no per-environment dimension here yet. That is the baseline the
 * account-grants work has to preserve — every route below must keep answering 404, not 403 and
 * not 200, when the caller reaches across teams.
 *
 * The app-side counterpart is app/jest-api/33.authz-characterization.
 */

const authenticateAs = (teamId: number) =>
  jest.spyOn(authenticateModule, 'authenticate').mockImplementationOnce(() =>
    Promise.resolve({
      success: true,
      data: { teamId } as any,
      err: null,
    }),
  );

describe('team scoping (dev baseline)', () => {
  let teamA: any;
  let teamB: any;
  let integrationA: any;
  let integrationB: any;
  let personalIntegration: any;

  beforeAll(async () => {
    jest.clearAllMocks();

    teamA = await seedTeamAndMembers('scoping team a', [
      { idirUserId: TEAM_ADMIN_IDIR_USERID_01, email: TEAM_ADMIN_IDIR_EMAIL_01, role: 'admin' },
    ]);
    teamB = await seedTeamAndMembers('scoping team b', []);

    integrationA = await seedIntergrations({
      integrationName: 'Scoping Integration A',
      teamId: teamA.id,
      submitted: true,
    });
    integrationB = await seedIntergrations({
      integrationName: 'Scoping Integration B',
      teamId: teamB.id,
      submitted: true,
    });
    personalIntegration = await seedIntergrations({
      integrationName: 'Scoping Personal Integration',
      submitted: true,
    });
  });

  it('rejects an unauthenticated caller with 401', async () => {
    await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(401);
  });

  it('lists only the integrations of the token holder team', async () => {
    authenticateAs(teamA.id);
    const res = await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(200);

    const ids = res.body.data.map((integration: any) => integration.id);
    expect(ids).toContain(integrationA.id);
    expect(ids).not.toContain(integrationB.id);
    expect(ids).not.toContain(personalIntegration.id);
  });

  it('admits the token holder team to its own integration', async () => {
    authenticateAs(teamA.id);
    const res = await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationA.id}`).expect(200);
    expect(res.body.id).toEqual(integrationA.id);
  });

  it('answers 404, not 403, for another team integration', async () => {
    authenticateAs(teamA.id);
    await supertest(app).get(`${API_BASE_PATH}/integrations/${integrationB.id}`).expect(404);
  });

  it('answers 404 for an integration with no team', async () => {
    authenticateAs(teamA.id);
    await supertest(app).get(`${API_BASE_PATH}/integrations/${personalIntegration.id}`).expect(404);
  });

  it('answers 404 for an integration that does not exist', async () => {
    authenticateAs(teamA.id);
    await supertest(app).get(`${API_BASE_PATH}/integrations/99999999`).expect(404);
  });

  /**
   * Every role operation resolves the integration through the same team-scoped lookup, so the
   * scope check happens before any Keycloak call. Listing the routes here is what makes that a
   * property of the API rather than a coincidence of one controller.
   */
  describe('role routes inherit the same scope', () => {
    it.each([
      ['list roles', (id: number) => `${API_BASE_PATH}/integrations/${id}/dev/roles`],
      ['get a role', (id: number) => `${API_BASE_PATH}/integrations/${id}/dev/roles/some-role`],
      [
        'list role user mappings',
        (id: number) => `${API_BASE_PATH}/integrations/${id}/dev/user-role-mappings?roleName=x`,
      ],
    ])('answers 404 on another team integration when asked to %s', async (_name, path) => {
      authenticateAs(teamA.id);
      await supertest(app)
        .get((path as (id: number) => string)(integrationB.id))
        .expect(404);
    });
  });

  it('scopes an archived integration out of the team entirely', async () => {
    const archived = await seedIntergrations({
      integrationName: 'Scoping Archived Integration',
      teamId: teamA.id,
      submitted: true,
    });
    await archived.update({ archived: true });

    authenticateAs(teamA.id);
    await supertest(app).get(`${API_BASE_PATH}/integrations/${archived.id}`).expect(404);
  });
});
