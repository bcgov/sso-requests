import { PRESETS } from '@sso/authz';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_02,
  TEAM_MEMBER_IDIR_EMAIL_02,
  SSO_ADMIN_USERID_01,
  SSO_ADMIN_EMAIL_01,
  BCEID_ADMIN_IDIR_USERID_01,
  BCEID_ADMIN_IDIR_EMAIL_01,
  postTeam,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { createIntegration } from './helpers/modules/integrations';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import { authorizeIntegration, resolveAccessForIntegrations } from '@app/queries/integrationAccess';
import { authorizeTeam } from '@app/queries/teamAccess';
import { processUserSession } from '@app/controllers/user';
import { teamPermissions } from '@app/utils/authorize';

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

// A session as every route builds it, for a user who may not have logged in before.
const sessionFor = async (idir_userid: string, email: string, client_roles: string[] = []): Promise<Session> => {
  const { session } = await processUserSession({
    idir_userid,
    email,
    client_roles,
    given_name: 'Test',
    family_name: 'User',
  } as Session);
  return session;
};

const asTeamAdmin = () => sessionFor(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
const asTeamMember = () => sessionFor(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
const asPendingTeamMember = () => sessionFor(TEAM_MEMBER_IDIR_USERID_02, TEAM_MEMBER_IDIR_EMAIL_02);
const asUnrelatedUser = () => sessionFor(UNRELATED_USERID, UNRELATED_EMAIL);
const asSsoAdmin = () => sessionFor(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
const asBceidApprover = () => sessionFor(BCEID_ADMIN_IDIR_USERID_01, BCEID_ADMIN_IDIR_EMAIL_01, ['bceid-approver']);
const asTeamMemberWhoIsSsoAdmin = () =>
  sessionFor(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01, ['sso-admin']);

const permissionsOf = async (session: Session, integrationId: number) => {
  const row = await models.request.findOne({ where: { id: integrationId } });
  return (await resolveAccessForIntegrations(session, [row])).get(integrationId)!;
};

/**
 * The common permission set, resolved for every (actor, integration) shape the retired
 * predicate admitted. Each source of authority — ownership, team role, app role, IdP
 * approval — is pinned on its own, and the union is checked where two apply at once.
 */
describe('integration access resolution', () => {
  let teamId: number;
  let personalIntegrationId: number;
  let teamIntegrationId: number;
  let teamlessDraftId: number;
  let bceidIntegrationId: number;
  let nonBceidIntegrationId: number;

  beforeAll(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();

    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const teamRes = await createTeam(postTeam);
    teamId = teamRes.body.id;

    const pendingUser = await models.user.findOne({ where: { idirEmail: TEAM_MEMBER_IDIR_EMAIL_02 } });
    await models.usersTeam.update({ pending: true }, { where: { teamId, userId: pendingUser.id } });

    personalIntegrationId = (await buildIntegration({ projectName: 'personal', submitted: true })).body.id;
    teamIntegrationId = (await buildIntegration({ projectName: 'team', teamId, submitted: true })).body.id;
    teamlessDraftId = (
      await createIntegration({ projectName: 'teamless draft', projectLead: true, serviceType: 'gold', usesTeam: true })
    ).body.id;

    createMockAuth(UNRELATED_USERID, UNRELATED_EMAIL);
    bceidIntegrationId = (await buildIntegration({ projectName: 'bceid', bceid: true, submitted: true })).body.id;
    nonBceidIntegrationId = (await buildIntegration({ projectName: 'azureidir', submitted: true })).body.id;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  describe('personal ownership', () => {
    it('resolves the owner of a personal integration to team-admin', async () => {
      const access = await permissionsOf(await asTeamAdmin(), personalIntegrationId);
      expect(access).toEqual({ owner: true, userTeamRole: null, permissions: PRESETS['team-admin'] });
    });

    it('resolves the owner of a team-less draft to team-admin', async () => {
      const access = await permissionsOf(await asTeamAdmin(), teamlessDraftId);
      expect(access).toEqual({ owner: true, userTeamRole: null, permissions: PRESETS['team-admin'] });
    });

    it('resolves anyone else to nothing', async () => {
      const access = await permissionsOf(await asUnrelatedUser(), personalIntegrationId);
      expect(access).toEqual({ owner: false, userTeamRole: null, permissions: [] });
    });
  });

  describe('team role', () => {
    it('resolves a team admin to team-admin', async () => {
      const access = await permissionsOf(await asTeamAdmin(), teamIntegrationId);
      expect(access).toEqual({ owner: false, userTeamRole: 'admin', permissions: PRESETS['team-admin'] });
    });

    it('resolves a team member to team-member', async () => {
      const access = await permissionsOf(await asTeamMember(), teamIntegrationId);
      expect(access).toEqual({ owner: false, userTeamRole: 'member', permissions: PRESETS['team-member'] });
    });

    it('resolves a pending member to nothing', async () => {
      const access = await permissionsOf(await asPendingTeamMember(), teamIntegrationId);
      expect(access).toEqual({ owner: false, userTeamRole: null, permissions: [] });
    });

    it('does not treat the creator of a team integration as its personal owner', async () => {
      // TEAM_ADMIN_01 created the team integration, so userId points at them; only the role counts.
      const member = await asTeamMember();
      const row = await models.request.findOne({ where: { id: teamIntegrationId }, raw: true });
      const admin = await models.user.findOne({ where: { idirEmail: TEAM_ADMIN_IDIR_EMAIL_01 }, raw: true });
      expect(row.userId).toEqual(admin.id);
      expect((await permissionsOf(member, teamIntegrationId)).owner).toBe(false);
    });
  });

  describe('app role', () => {
    it('resolves an sso-admin to the dashboard permissions on any integration', async () => {
      const access = await permissionsOf(await asSsoAdmin(), teamIntegrationId);
      expect(access).toEqual({
        owner: false,
        userTeamRole: null,
        permissions: [
          'integrations:read',
          'integrations:write',
          'integrations:delete',
          'integrations:reassign-team',
          'roles:read',
          'user-role-mappings:read',
        ],
      });
    });

    it('unions the app role with a team role rather than replacing it', async () => {
      const access = await permissionsOf(await asTeamMemberWhoIsSsoAdmin(), teamIntegrationId);
      expect(access.userTeamRole).toEqual('member');
      // team-member lacks integrations:delete; the app role supplies it. Neither supplies roles:write.
      expect(access.permissions).toContain('integrations:delete');
      expect(access.permissions).toContain('idp-users:read');
      expect(access.permissions).not.toContain('roles:write');
    });
  });

  describe('IdP approval', () => {
    it('resolves an approver to read on an integration using their IdP', async () => {
      const access = await permissionsOf(await asBceidApprover(), bceidIntegrationId);
      expect(access).toEqual({ owner: false, userTeamRole: null, permissions: ['integrations:read'] });
    });

    it('resolves an approver to nothing on an integration not using their IdP', async () => {
      const access = await permissionsOf(await asBceidApprover(), nonBceidIntegrationId);
      expect(access.permissions).toEqual([]);
    });
  });

  describe('authorizeIntegration', () => {
    it('returns the row and its access together when the permission is held', async () => {
      const authorized = await authorizeIntegration(await asTeamMember(), teamIntegrationId, 'integrations:write');
      expect(authorized).not.toBeNull();
      expect(authorized!.integration.id).toEqual(teamIntegrationId);
      expect(authorized!.access.userTeamRole).toEqual('member');
      // The role is attached to the row for the client-side guards, as the predicate's literal column was.
      expect(authorized!.integration.get({ plain: true }).userTeamRole).toEqual('member');
      expect(authorized!.integration.team.id).toEqual(teamId);
    });

    it('returns null when the permission is not held', async () => {
      const member = await asTeamMember();
      expect(await authorizeIntegration(member, teamIntegrationId, 'integrations:delete')).toBeNull();
      expect(await authorizeIntegration(member, personalIntegrationId, 'integrations:read')).toBeNull();
    });

    it('returns null for a row that does not exist', async () => {
      expect(await authorizeIntegration(await asSsoAdmin(), 999999, 'integrations:read')).toBeNull();
    });

    it('admits archived rows unless told otherwise', async () => {
      await models.request.update({ archived: true }, { where: { id: personalIntegrationId } });
      const owner = await asTeamAdmin();
      expect(await authorizeIntegration(owner, personalIntegrationId, 'integrations:read')).not.toBeNull();
      expect(
        await authorizeIntegration(owner, personalIntegrationId, 'integrations:read', { archived: false }),
      ).toBeNull();
      await models.request.update({ archived: false }, { where: { id: personalIntegrationId } });
    });
  });

  describe('authorizeTeam', () => {
    it('returns the team and the role for an accepted member holding the permission', async () => {
      const authorized = await authorizeTeam(await asTeamAdmin(), teamId, teamPermissions.ADD_MEMBER);
      expect(authorized!.team.id).toEqual(teamId);
      expect(authorized!.access.role).toEqual('admin');
    });

    it('returns null for a role without the permission, a pending member, a non-member and a missing team', async () => {
      expect(await authorizeTeam(await asTeamMember(), teamId, teamPermissions.ADD_MEMBER)).toBeNull();
      expect(await authorizeTeam(await asPendingTeamMember(), teamId, teamPermissions.UPDATE_REQUEST)).toBeNull();
      expect(await authorizeTeam(await asUnrelatedUser(), teamId, teamPermissions.UPDATE_REQUEST)).toBeNull();
      expect(await authorizeTeam(await asTeamAdmin(), 999999, teamPermissions.ADD_MEMBER)).toBeNull();
    });
  });
});
