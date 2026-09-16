import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_02,
  TEAM_MEMBER_IDIR_EMAIL_02,
  SSO_ADMIN_USERID_01,
  SSO_ADMIN_EMAIL_01,
  BCEID_ADMIN_IDIR_USERID_01,
  BCEID_ADMIN_IDIR_EMAIL_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
  postTeam,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import {
  createIntegration,
  deleteIntegration,
  fetchMetrics,
  getIntegration,
  getIntegrations,
  getListOfIntegrations,
  getRequestScopedEvents,
  updateIntegration,
} from './helpers/modules/integrations';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { deleteRequest } from '@app/controllers/requests';
import { Session } from '@app/shared/interfaces';

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

const UNRELATED_USERID = 'UNRELATED_IDIR_USER_01';
const UNRELATED_EMAIL = 'unrelated.idir.user-01@gov.bc.ca';

const asTeamAdmin = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
const asSecondTeamAdmin = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
const asTeamMember = () => createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
const asPendingTeamMember = () => createMockAuth(TEAM_MEMBER_IDIR_USERID_02, TEAM_MEMBER_IDIR_EMAIL_02);
const asUnrelatedUser = () => createMockAuth(UNRELATED_USERID, UNRELATED_EMAIL);
const asSsoAdmin = () => createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
const asBceidApprover = () => createMockAuth(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);

const setStatus = async (integrationId: number, status: string) =>
  models.request.update({ status }, { where: { id: integrationId } });

/**
 * Characterization tests for the authorization behaviour, recorded on `dev` before the
 * authorization rewrite began.
 *
 * Two things are pinned:
 *
 *  1. Row visibility — which (actor, integration) pairs are admitted, and the status code each
 *     route turns a miss into. The same authorization miss surfaces as 200-with-null, 403, 401
 *     or 422 depending on which route you came in through; that is deliberate to record, because
 *     the rewrite is meant to make rejection uniform.
 *
 *  2. Known bugs, pinned AS BUGS while they stood. The delete and update sections were flipped
 *     deliberately when the transition table and diff-then-authorize landed: each case marked
 *     `Fn` now pins the corrected behaviour and says what it replaced. `BUG (F6)` still stands.
 */
describe('authorization characterization (dev baseline)', () => {
  let teamId: number;
  let personalIntegrationId: number;
  let teamIntegrationId: number;
  let teamlessDraftId: number;
  let bceidIntegrationId: number;
  let nonBceidIntegrationId: number;

  beforeAll(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();

    asTeamAdmin();
    const teamRes = await createTeam(postTeam);
    teamId = teamRes.body.id;

    // TEAM_MEMBER_02 is a member of the team but has not accepted the invitation.
    const pendingUser = await models.user.findOne({ where: { idirEmail: TEAM_MEMBER_IDIR_EMAIL_02 } });
    await models.usersTeam.update({ pending: true }, { where: { teamId, userId: pendingUser.id } });

    const personal = await buildIntegration({ projectName: 'personal integration', submitted: true });
    personalIntegrationId = personal.body.id;

    const team = await buildIntegration({ projectName: 'team integration', teamId, submitted: true });
    teamIntegrationId = team.body.id;

    // usesTeam with no team selected yet — only reachable while still a draft.
    const draft = await createIntegration({
      projectName: 'teamless draft',
      projectLead: true,
      serviceType: 'gold',
      usesTeam: true,
    });
    teamlessDraftId = draft.body.id;

    // Owned by someone with no relationship to the team, for the IdP-approver cases.
    asUnrelatedUser();
    const bceid = await buildIntegration({ projectName: 'bceid integration', bceid: true, submitted: true });
    bceidIntegrationId = bceid.body.id;

    const nonBceid = await buildIntegration({ projectName: 'azureidir integration', submitted: true });
    nonBceidIntegrationId = nonBceid.body.id;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  /**
   * `POST /api/request` -> getRequest -> getAllowedRequest.
   * Note the shape of a denial: HTTP 200 with a null body, not 403.
   */
  describe('read a single integration', () => {
    it('admits the owner of a personal integration', async () => {
      asTeamAdmin();
      const res = await getIntegration(personalIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(personalIntegrationId);
    });

    it('admits a team member of the owning team', async () => {
      asTeamMember();
      const res = await getIntegration(teamIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(teamIntegrationId);
    });

    it('admits a second admin of the owning team', async () => {
      asSecondTeamAdmin();
      const res = await getIntegration(teamIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(teamIntegrationId);
    });

    it('admits the owner of a team-less draft', async () => {
      asTeamAdmin();
      const res = await getIntegration(teamlessDraftId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(teamlessDraftId);
    });

    it('rejects a team member whose membership is still pending, as 200 with a null body', async () => {
      asPendingTeamMember();
      const res = await getIntegration(teamIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body).toBeNull();
    });

    it('rejects an unrelated user, as 200 with a null body', async () => {
      asUnrelatedUser();
      const res = await getIntegration(teamIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body).toBeNull();
    });

    it('admits an sso-admin to any integration', async () => {
      asSsoAdmin();
      const res = await getIntegration(teamIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(teamIntegrationId);
    });

    it('admits an IdP approver to any integration using an IdP they approve', async () => {
      asBceidApprover();
      const res = await getIntegration(bceidIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body.id).toEqual(bceidIntegrationId);
    });

    it('rejects an IdP approver on an integration not using their IdP, as 200 with a null body', async () => {
      asBceidApprover();
      const res = await getIntegration(nonBceidIntegrationId);
      expect(res.status).toEqual(200);
      expect(res.body).toBeNull();
    });
  });

  /**
   * `GET /api/requests/[id]/events` -> getRequestScopedEvents -> getAllowedRequest.
   * Same predicate as above; a miss is a 403 here.
   */
  describe('read request-scoped events', () => {
    it('admits a team member of the owning team', async () => {
      asTeamMember();
      const res = await getRequestScopedEvents(teamIntegrationId);
      expect(res.status).toEqual(200);
    });

    it('rejects an unrelated user with 403', async () => {
      asUnrelatedUser();
      const res = await getRequestScopedEvents(teamIntegrationId);
      expect(res.status).toEqual(403);
    });

    it('admits an sso-admin', async () => {
      asSsoAdmin();
      const res = await getRequestScopedEvents(teamIntegrationId);
      expect(res.status).toEqual(200);
    });

    it('admits an IdP approver on an integration using an IdP they approve', async () => {
      asBceidApprover();
      const res = await getRequestScopedEvents(bceidIntegrationId);
      expect(res.status).toEqual(200);
    });

    it('rejects an IdP approver on an integration not using their IdP with 403', async () => {
      asBceidApprover();
      const res = await getRequestScopedEvents(nonBceidIntegrationId);
      expect(res.status).toEqual(403);
    });
  });

  /**
   * `GET /api/requests/[id]/metrics` -> fetchMetrics -> getAllowedRequest.
   * The same miss is a 401 here. The authorized path is covered by 16.integration-metrics.
   */
  describe('read integration metrics', () => {
    it('rejects an unrelated user with 401', async () => {
      asUnrelatedUser();
      const res = await fetchMetrics(teamIntegrationId, '2024-01-01', '2024-01-02', 'dev');
      expect(res.status).toEqual(401);
    });
  });

  /**
   * `GET /api/requests` -> getRequests -> getBaseWhereForMyOrTeamIntegrations.
   * The list path never consults the admin or IdP-approver branches: it is the bare predicate.
   */
  describe('list my integrations', () => {
    it('returns personal, team and team-less-draft integrations to their owner', async () => {
      asTeamAdmin();
      const res = await getIntegrations();
      expect(res.status).toEqual(200);
      const ids = res.body.map((integration: any) => integration.id);
      expect(ids).toEqual(expect.arrayContaining([personalIntegrationId, teamIntegrationId, teamlessDraftId]));
    });

    it('returns the team integration to a team member, and not the admin personal integration', async () => {
      asTeamMember();
      const res = await getIntegrations();
      expect(res.status).toEqual(200);
      const ids = res.body.map((integration: any) => integration.id);
      expect(ids).toContain(teamIntegrationId);
      expect(ids).not.toContain(personalIntegrationId);
    });

    it('returns nothing to a team member whose membership is still pending', async () => {
      asPendingTeamMember();
      const res = await getIntegrations();
      expect(res.status).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('returns only their own integrations to an sso-admin — the list path has no admin branch', async () => {
      asSsoAdmin();
      const res = await getIntegrations();
      expect(res.status).toEqual(200);
      expect(res.body).toEqual([]);
    });

    it('returns only their own integrations to an IdP approver — the list path has no approver branch', async () => {
      asBceidApprover();
      const res = await getIntegrations();
      expect(res.status).toEqual(200);
      expect(res.body).toEqual([]);
    });
  });

  /**
   * `POST /api/requests-all` -> getRequestAll. A separate predicate keyed off app permissions,
   * not team membership.
   */
  describe('list all integrations (admin dashboard)', () => {
    it('rejects a user with no admin-dashboard permission with 403', async () => {
      asTeamAdmin();
      const res = await getListOfIntegrations({ searchField: ['projectName'], searchKey: '' });
      expect(res.status).toEqual(403);
    });

    it('returns every integration to an sso-admin', async () => {
      asSsoAdmin();
      const res = await getListOfIntegrations({ searchField: ['projectName'], searchKey: '' });
      expect(res.status).toEqual(200);
      const ids = res.body.rows.map((integration: any) => integration.id);
      expect(ids).toEqual(expect.arrayContaining([personalIntegrationId, teamIntegrationId, bceidIntegrationId]));
    });

    it('returns only integrations using their IdP to an approver', async () => {
      asBceidApprover();
      const res = await getListOfIntegrations({ searchField: ['projectName'], searchKey: '' });
      expect(res.status).toEqual(200);
      const ids = res.body.rows.map((integration: any) => integration.id);
      expect(ids).toContain(bceidIntegrationId);
      expect(ids).not.toContain(nonBceidIntegrationId);
    });

    /**
     * BUG (F6): this path attaches no access metadata and performs no redaction, so an approver
     * receives the whole record — every environment field — of an integration they have no
     * relationship to beyond the IdP.
     */
    it('BUG (F6): gives an approver the unredacted record of an integration they do not own', async () => {
      asBceidApprover();
      const res = await getListOfIntegrations({ searchField: ['projectName'], searchKey: '' });
      const integration = res.body.rows.find((row: any) => row.id === bceidIntegrationId);
      expect(integration.devValidRedirectUris).toEqual(['https://a']);
      expect(integration.testValidRedirectUris).toEqual(['https://a']);
    });
  });

  /**
   * `DELETE /api/requests?id=` -> deleteRequest. The guard is in the controller: which delete
   * transition the row's status admits (deleteDraft, requestDelete, forceDelete) and whether the
   * actor holds its permission. A row the actor cannot read is 404; a transition they may not
   * take is 403.
   */
  describe('delete an integration', () => {
    let deletable: number;

    beforeEach(async () => {
      asTeamAdmin();
      const res = await buildIntegration({ projectName: `deletable ${Date.now()}`, submitted: true });
      deletable = res.body.id;
    });

    it('admits the owner of an applied integration', async () => {
      asTeamAdmin();
      const res = await deleteIntegration(deletable);
      expect(res.status).toEqual(200);
    });

    it('rejects an unrelated user with 404 — the row is not theirs to see', async () => {
      asUnrelatedUser();
      const res = await deleteIntegration(deletable);
      expect(res.status).toEqual(404);
    });

    /**
     * F4 flipped: a failed integration is resting, so its owner may delete it — the button the
     * "integration failed" modal draws now does what it says. Was 401.
     */
    it.each(['planFailed', 'applyFailed'])('F4: admits the owner when the integration is in %s', async (status) => {
      await setStatus(deletable, status);
      asTeamAdmin();
      const res = await deleteIntegration(deletable);
      expect(res.status).toEqual(200);
      expect(res.body.archived).toBe(true);
    });

    it('rejects the owner with 403 while the integration is in flight — forceDelete is not theirs', async () => {
      await setStatus(deletable, 'planned');
      asTeamAdmin();
      const res = await deleteIntegration(deletable);
      expect(res.status).toEqual(403);
      expect(res.body.message).toContain('forceDelete');
    });

    /**
     * F9: deliberate, and now a row in the transition table — `forceDelete`, gated by
     * `integrations:delete-in-flight`, which sso-admin holds — rather than a branch around it.
     */
    it('F9: admits an sso-admin while the integration is in flight', async () => {
      await setStatus(deletable, 'planned');
      asSsoAdmin();
      const res = await deleteIntegration(deletable);
      expect(res.status).toEqual(200);
    });

    /**
     * F8 flipped: the status guard lives in the controller, so a second caller cannot archive an
     * in-flight integration under the Keycloak client creation that `planned` represents.
     */
    it('F8: the controller refuses an in-flight integration when called directly', async () => {
      await setStatus(deletable, 'planned');
      const user = await models.user.findOne({ where: { idirEmail: TEAM_ADMIN_IDIR_EMAIL_01 } });
      const session = {
        idir_userid: TEAM_ADMIN_IDIR_USERID_01,
        email: TEAM_ADMIN_IDIR_EMAIL_01,
        client_roles: [],
        user: user.get({ plain: true }),
      } as unknown as Session;

      await expect(deleteRequest(session, session.user!, deletable)).rejects.toMatchObject({ status: 403 });
      const stored = await models.request.findOne({ where: { id: deletable } });
      expect(stored.archived).toBe(false);
      expect(stored.status).toEqual('planned');
    });
  });

  /**
   * `PUT /api/requests` -> updateRequest. The environment rules are constraints on the diff now,
   * so a refused change is a refusal naming the field rather than a silent edit to the payload.
   * The route still wraps every update failure as 422.
   */
  describe('update an integration', () => {
    let applied: any;

    beforeEach(async () => {
      asTeamAdmin();
      const res = await buildIntegration({
        projectName: `updatable ${Date.now()}`,
        prodEnv: true,
        submitted: true,
      });
      applied = res.body;
      expect(applied.status).toEqual('applied');
      expect(applied.environments).toEqual(['dev', 'test', 'prod']);
    });

    it('admits a team member of the owning team', async () => {
      asTeamAdmin();
      const teamRes = await buildIntegration({ projectName: `team updatable ${Date.now()}`, teamId, submitted: true });
      asTeamMember();
      const res = await updateIntegration(
        getUpdateIntegrationData({ integration: teamRes.body, projectName: 'renamed by member' }),
        true,
      );
      expect(res.status).toEqual(200);
      expect(res.body.projectName).toEqual('renamed by member');
    });

    it('rejects an unrelated user with 422', async () => {
      asUnrelatedUser();
      const res = await updateIntegration(getUpdateIntegrationData({ integration: applied }), true);
      expect(res.status).toEqual(422);
    });

    /**
     * F3 flipped: removing an environment from an applied integration is refused, naming the
     * environments. Was a 200 with the removal silently discarded.
     */
    it('F3: refuses an environment removal and names the environments', async () => {
      asTeamAdmin();
      const res = await updateIntegration(getUpdateIntegrationData({ integration: applied, envs: ['dev'] }), true);
      expect(res.status).toEqual(422);
      expect(res.body.message).toEqual('environments: cannot remove test, prod once the integration is applied');

      const stored = await models.request.findOne({ where: { id: applied.id } });
      expect(stored.environments).toEqual(['dev', 'test', 'prod']);
    });

    /**
     * F12 flipped: an environment outside dev/test/prod is refused rather than filtered out.
     */
    it('F12: refuses an invalid environment and names it', async () => {
      asTeamAdmin();
      const res = await updateIntegration(
        getUpdateIntegrationData({ integration: applied, envs: ['dev', 'test', 'prod', 'staging'] }),
        true,
      );
      expect(res.status).toEqual(422);
      expect(res.body.message).toEqual('environments: staging is not a valid environment');
    });

    /**
     * F11 flipped: a field absent from the payload is not a change. Nothing is built from it,
     * so nothing malformed reaches validation or Terraform; the stored value stands.
     */
    it('F11: leaves environments untouched when the payload omits the field', async () => {
      asTeamAdmin();
      const payload: any = getUpdateIntegrationData({ integration: applied });
      delete payload.environments;
      const res = await updateIntegration(payload, true);

      expect(res.status).toEqual(200);
      expect(res.body.environments).toEqual(['dev', 'test', 'prod']);

      const stored = await models.request.findOne({ where: { id: applied.id } });
      expect(stored.environments).toEqual(['dev', 'test', 'prod']);
    });
  });
});
