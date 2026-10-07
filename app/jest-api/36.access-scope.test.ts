import { Permission, TEAM_SCOPED_PERMISSIONS } from '@sso/authz';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_02,
  TEAM_MEMBER_IDIR_EMAIL_02,
  TEAM_ADMIN_IDIR_EMAIL_03,
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
import { Session, User } from '@app/shared/interfaces';
import { AccessScope, accessibleIntegrationsWhere, resolveAccessScope, scopedTeamIds } from '@app/queries/accessScope';
import { resolveAccessForIntegrations } from '@app/queries/integrationAccess';
import { getIntegrations, getRequests } from '@app/controllers/requests';
import { processUserSession } from '@app/controllers/user';

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

const ids = (rows: any[]) => rows.map((row) => Number(row.id)).sort((a, b) => a - b);

const everyIntegration = () => models.request.findAll({ where: { apiServiceAccount: false }, raw: true });

// The rows the list predicate admits for one permission.
const admittedByPredicate = async (scope: AccessScope, permission: Permission) => {
  const where = accessibleIntegrationsWhere(scope, permission);
  if (!where) return [];
  return ids(await models.request.findAll({ where, attributes: ['id'], raw: true }));
};

// The rows the per-row resolver grants the same permission on, read by brute force.
const admittedByResolver = async (session: Session, scope: AccessScope, permission: Permission) => {
  const rows = await everyIntegration();
  const access = await resolveAccessForIntegrations(session, rows, scope);
  return ids(rows.filter((row: any) => access.get(row.id)!.permissions.includes(permission)));
};

/**
 * The scope resolver, and the one claim it exists to make: the `where` clause of a list
 * query and the per-row resolve that follows it are the same derivation, so they cannot
 * disagree about which rows an actor reaches.
 *
 * App roles and IdP approval are not row-scoped and are deliberately outside the scope —
 * the equivalence is asserted for actors who hold neither, and the no-widening cases pin
 * that an sso-admin and an approver reach no extra rows through a list.
 */
describe('integration access scope', () => {
  let teamId: number;
  let otherTeamId: number;
  let personalIntegrationId: number;
  let teamIntegrationId: number;
  let otherTeamIntegrationId: number;
  let teamlessDraftId: number;
  let memberPersonalId: number;
  let bceidIntegrationId: number;
  let strangersIntegrationId: number;

  beforeAll(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();

    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    teamId = (await createTeam(postTeam)).body.id;

    // TEAM_MEMBER_02 was invited but never accepted.
    const pendingUser = await models.user.findOne({ where: { idirEmail: TEAM_MEMBER_IDIR_EMAIL_02 } });
    await models.usersTeam.update({ pending: true }, { where: { teamId, userId: pendingUser.id } });

    // A second team the member also belongs to, so the predicate has to OR two memberships.
    otherTeamId = (
      await createTeam({
        name: 'team_02',
        members: [
          { idirEmail: TEAM_MEMBER_IDIR_EMAIL_01, role: 'member' },
          { idirEmail: TEAM_ADMIN_IDIR_EMAIL_03, role: 'admin' },
        ],
      })
    ).body.id;

    personalIntegrationId = (await buildIntegration({ projectName: 'personal', submitted: true })).body.id;
    teamIntegrationId = (await buildIntegration({ projectName: 'team', teamId, submitted: true })).body.id;
    otherTeamIntegrationId = (
      await buildIntegration({ projectName: 'other team', teamId: otherTeamId, submitted: true })
    ).body.id;
    teamlessDraftId = (
      await createIntegration({ projectName: 'teamless draft', projectLead: true, serviceType: 'gold', usesTeam: true })
    ).body.id;

    // The member owns one integration outright, so the personal branch and the
    // team branch can be seen to be gated on the permission independently.
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    memberPersonalId = (await buildIntegration({ projectName: 'member personal', submitted: true })).body.id;

    createMockAuth(UNRELATED_USERID, UNRELATED_EMAIL);
    bceidIntegrationId = (await buildIntegration({ projectName: 'bceid', bceid: true, submitted: true })).body.id;
    strangersIntegrationId = (await buildIntegration({ projectName: 'azureidir', submitted: true })).body.id;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  describe('the predicate and the resolver are one derivation', () => {
    const actors: [string, () => Promise<Session>][] = [
      ['a team admin', asTeamAdmin],
      ['a team member of two teams', asTeamMember],
      ['a member whose invitation is still pending', asPendingTeamMember],
      ['a user with no relationship to any of them', asUnrelatedUser],
    ];

    it.each(actors)('admits exactly the rows the resolver grants each permission on, for %s', async (_name, actor) => {
      const session = await actor();
      const scope = await resolveAccessScope(session.user!.id as number);

      for (const permission of TEAM_SCOPED_PERMISSIONS) {
        expect([permission, await admittedByPredicate(scope, permission)]).toEqual([
          permission,
          await admittedByResolver(session, scope, permission),
        ]);
      }
    });

    it('admits every source: personal, both teams, and a team-less draft', async () => {
      const session = await asTeamAdmin();
      const scope = await resolveAccessScope(session.user!.id as number);
      expect(await admittedByPredicate(scope, 'integrations:read')).toEqual(
        ids([
          { id: personalIntegrationId },
          { id: teamIntegrationId },
          { id: otherTeamIntegrationId },
          { id: teamlessDraftId },
        ]),
      );
    });

    it('admits nothing on a pending membership', async () => {
      const session = await asPendingTeamMember();
      const scope = await resolveAccessScope(session.user!.id as number);
      expect(await admittedByPredicate(scope, 'integrations:read')).toEqual([]);
    });

    it('keeps one actor out of another actor’s rows', async () => {
      const session = await asTeamMember();
      const scope = await resolveAccessScope(session.user!.id as number);
      const admitted = await admittedByPredicate(scope, 'integrations:read');
      expect(admitted).toEqual(
        ids([{ id: teamIntegrationId }, { id: otherTeamIntegrationId }, { id: memberPersonalId }]),
      );
      expect(admitted).not.toContain(personalIntegrationId);
      expect(admitted).not.toContain(strangersIntegrationId);
    });
  });

  describe('the permission decides the scope', () => {
    it('drops a team whose role does not confer the permission', async () => {
      const session = await asTeamMember();
      const scope = await resolveAccessScope(session.user!.id as number);

      // team-member holds write but not delete, so a member's teams are in scope
      // for one and out of scope for the other.
      expect(scopedTeamIds(scope, 'integrations:write').sort()).toEqual([teamId, otherTeamId].sort());
      expect(scopedTeamIds(scope, 'integrations:delete')).toEqual([]);
    });

    it('still admits a member’s own rows for a permission no team role of theirs confers', async () => {
      const session = await asTeamMember();
      const scope = await resolveAccessScope(session.user!.id as number);
      // Personal ownership resolves to team-admin, which does hold delete — so
      // the two branches answer differently for the same actor and permission.
      expect(await admittedByPredicate(scope, 'integrations:delete')).toEqual([memberPersonalId]);
    });

    it('returns null for an admin-scoped permission, which no row-level source confers', async () => {
      const session = await asTeamAdmin();
      const scope = await resolveAccessScope(session.user!.id as number);
      expect(accessibleIntegrationsWhere(scope, 'integrations:approve-bceid')).toBeNull();
    });
  });

  describe('app roles and IdP approval do not widen a list', () => {
    it('gives an sso-admin no rows beyond their own', async () => {
      const session = await asSsoAdmin();
      const scope = await resolveAccessScope(session.user!.id as number);
      expect(await admittedByPredicate(scope, 'integrations:read')).toEqual([]);
    });

    it('gives an IdP approver no rows beyond their own, including the integration using their IdP', async () => {
      const session = await asBceidApprover();
      const scope = await resolveAccessScope(session.user!.id as number);
      const admitted = await admittedByPredicate(scope, 'integrations:read');
      expect(admitted).toEqual([]);
      expect(admitted).not.toContain(bceidIntegrationId);
    });
  });

  describe('the list paths read it once', () => {
    it('resolves memberships once per dashboard list, whatever the result size', async () => {
      const session = await asTeamAdmin();
      const spy = jest.spyOn(models.usersTeam, 'findAll');

      const requests = await getRequests(session, session.user as User);

      expect(requests.length).toBeGreaterThan(1);
      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });

    it('attaches the role each row was admitted on', async () => {
      const session = await asTeamMember();
      const requests = await getRequests(session, session.user as User);
      const byId = new Map(requests.map((row: any) => [row.id, row.get({ plain: true }).userTeamRole]));

      expect(byId.get(teamIntegrationId)).toEqual('member');
      expect(byId.get(otherTeamIntegrationId)).toEqual('member');
      expect(byId.get(memberPersonalId)).toBeNull();
      expect(byId.has(personalIntegrationId)).toBe(false);
    });

    it('leaves the role null on a row reached by personal ownership', async () => {
      const session = await asTeamAdmin();
      const requests = await getRequests(session, session.user as User);
      const personal: any = requests.find((row: any) => row.id === personalIntegrationId);

      expect(personal.get({ plain: true }).userTeamRole).toBeNull();
    });

    it('returns one team’s integrations to a member of it', async () => {
      const session = await asTeamMember();
      const integrations = await getIntegrations(session, teamId, session.user as User);

      expect(ids(integrations)).toEqual([teamIntegrationId]);
      expect((integrations[0] as any).get({ plain: true }).userTeamRole).toEqual('member');
    });

    it('returns nothing to a non-member, without reading the team’s rows', async () => {
      const session = await asUnrelatedUser();
      const spy = jest.spyOn(models.request, 'findAll');

      expect(await getIntegrations(session, teamId, session.user as User)).toEqual([]);
      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('returns nothing to a pending member', async () => {
      const session = await asPendingTeamMember();
      expect(await getIntegrations(session, teamId, session.user as User)).toEqual([]);
    });
  });
});
