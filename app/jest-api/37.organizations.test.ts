import { Op } from 'sequelize';
import { Permission, PRESETS } from '@sso/authz';
import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_02,
  TEAM_ADMIN_IDIR_EMAIL_02,
  TEAM_MEMBER_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  SSO_ADMIN_USERID_01,
  SSO_ADMIN_EMAIL_01,
  postTeam,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { Session, User } from '@app/shared/interfaces';
import { accessibleIntegrationsWhere, resolveAccessScope } from '@app/queries/accessScope';
import { resolveAccessForIntegrations } from '@app/queries/integrationAccess';
import { getIntegrations, getRequests } from '@app/controllers/requests';
import { isAllowedToManageRoles, processUserSession } from '@app/controllers/user';
import {
  createOrganization,
  updateOrganization,
  inviteTeam,
  leaveOrganization,
  listOrganizations,
  listTeamIntegrations,
  listTeamOrganizationLinks,
  removeTeamFromOrganization,
  searchTeams,
  respondToOrganizationInvitation,
  updateIntegrationOverrides,
  updateTeamConsent,
  addOrganizationMember,
  listOrganizationMembers,
  removeOrganizationMember,
  updateOrganizationMemberRole,
  createOrganizationApiAccount,
  getOrganizationApiAccountCredentials,
  updateOrganizationApiAccountSecret,
  deleteOrganizationApiAccount,
  listOrganizationApiAccounts,
} from '@app/controllers/organization';

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

const ORG_ADMIN_USERID = 'ORG_ADMIN_IDIR_USER_01';
const ORG_ADMIN_EMAIL = 'org.admin.idir.user-01@gov.bc.ca';
const ORG_MEMBER_USERID = 'ORG_MEMBER_IDIR_USER_01';
const ORG_MEMBER_EMAIL = 'org.member.idir.user-01@gov.bc.ca';

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

const asSsoAdmin = () => sessionFor(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
const asOrgAdmin = () => sessionFor(ORG_ADMIN_USERID, ORG_ADMIN_EMAIL);
const asOrgMember = () => sessionFor(ORG_MEMBER_USERID, ORG_MEMBER_EMAIL);
const asTeamAdmin = () => sessionFor(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
const asOtherTeamAdmin = () => sessionFor(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
const asTeamMember = () => sessionFor(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);

const ids = (rows: any[]) => rows.map((row) => Number(row.id)).sort((a, b) => a - b);

// The rows the list predicate admits, read against the database.
const admitted = async (session: Session, permission: Permission) => {
  const scope = await resolveAccessScope(session.user!.id as number);
  const where = accessibleIntegrationsWhere(scope, permission);
  if (!where) return [];
  return ids(await models.request.findAll({ where, attributes: ['id'], raw: true }));
};

// What the per-row resolver grants on one integration.
const resolvedOn = async (session: Session, integrationId: number) => {
  const row = await models.request.findOne({ where: { id: integrationId }, raw: true });
  const access = await resolveAccessForIntegrations(session, [row]);
  return access.get(integrationId)!.permissions;
};

const linkFor = (organizationId: number, teamId: number) =>
  models.organizationTeam.findOne({ where: { organizationId, teamId }, raw: true });

/**
 * Organizations: the negotiation that produces a consent, and what that consent
 * reaches once it is in force.
 *
 * The two halves are the same rule read twice — the link's permissions minus
 * any per-integration override — so the access tests assert the list predicate
 * and the per-row resolver agree on every case.
 */
describe('organizations', () => {
  let organizationId: number;
  let otherOrganizationId: number;
  let teamId: number;
  let otherTeamId: number;
  let teamIntegrationId: number;
  let cappedIntegrationId: number;
  let otherTeamIntegrationId: number;

  beforeAll(async () => {
    jest.clearAllMocks();
    await cleanUpDatabaseTables();

    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    teamId = (await createTeam(postTeam)).body.id;
    teamIntegrationId = (await buildIntegration({ projectName: 'org team', teamId, submitted: true })).body.id;
    cappedIntegrationId = (await buildIntegration({ projectName: 'org capped', teamId, submitted: true })).body.id;

    createMockAuth(TEAM_ADMIN_IDIR_USERID_02, TEAM_ADMIN_IDIR_EMAIL_02);
    otherTeamId = (
      await createTeam({
        name: 'unconsenting_team',
        members: [{ idirEmail: TEAM_ADMIN_IDIR_EMAIL_02, role: 'admin' }],
      })
    ).body.id;
    otherTeamIntegrationId = (
      await buildIntegration({ projectName: 'other team', teamId: otherTeamId, submitted: true })
    ).body.id;

    // The organization's own people, who belong to no team at all.
    const ssoAdmin = await asSsoAdmin();
    const organization = await createOrganization(ssoAdmin, { name: 'Ministry of Tests' });
    organizationId = organization.id;
    otherOrganizationId = (await createOrganization(ssoAdmin, { name: 'Ministry of Other Tests' })).id;

    await asOrgAdmin();
    await asOrgMember();
    await addOrganizationMember(ssoAdmin, organizationId, { idirEmail: ORG_ADMIN_EMAIL, role: 'admin' });
    await addOrganizationMember(ssoAdmin, organizationId, { idirEmail: ORG_MEMBER_EMAIL, role: 'member' });
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  describe('the negotiation', () => {
    afterEach(async () => {
      await models.organizationTeam.destroy({ where: {} });
    });

    it('lets only a CSS admin create an organization', async () => {
      await expect(createOrganization(await asTeamAdmin(), { name: 'Ministry of None' })).rejects.toThrow();
    });

    it('shows an organization to its members and to nobody else', async () => {
      expect(ids(await listOrganizations(await asOrgMember()))).toEqual([organizationId]);
      expect(await listOrganizations(await asTeamAdmin())).toEqual([]);
    });

    it('puts nothing in force while the invitation is pending', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });

      expect((await linkFor(organizationId, teamId)).pending).toBe(true);
      expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual([]);
      expect(await resolvedOn(await asOrgAdmin(), teamIntegrationId)).toEqual([]);
    });

    it('refuses a consent naming an administrative permission', async () => {
      await expect(
        inviteTeam(await asOrgAdmin(), organizationId, {
          teamId,
          permissions: ['integrations:read', 'integrations:approve-bceid'] as Permission[],
        }),
      ).rejects.toThrow(/cannot consent/);
    });

    /**
     * Ownership stays the team's however broad the consent. Presets never offer
     * reassign-team, so this is about a consent that names permissions
     * directly: an organization able to move an integration could move it out
     * of reach of the consent that granted it, into a team of its own.
     */
    it('refuses a consent naming reassign-team, on every path that writes one', async () => {
      const withReassign = [...PRESETS.editor, 'integrations:reassign-team'] as Permission[];

      await expect(
        inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: withReassign }),
      ).rejects.toThrow(/cannot consent/);

      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      await expect(
        respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, {
          accept: true,
          permissions: withReassign,
        }),
      ).rejects.toThrow(/cannot consent/);

      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });
      await expect(updateTeamConsent(await asTeamAdmin(), teamId, organizationId, withReassign)).rejects.toThrow(
        /cannot consent/,
      );
      await expect(
        updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
          { requestId: teamIntegrationId, permissions: withReassign },
        ]),
      ).rejects.toThrow(/cannot consent/);

      expect(await resolvedOn(await asOrgAdmin(), teamIntegrationId)).not.toContain('integrations:reassign-team');
    });

    it('lets a team admin accept, and only a team admin', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });

      await expect(
        respondToOrganizationInvitation(await asTeamMember(), teamId, organizationId, { accept: true }),
      ).rejects.toThrow();

      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });
      const link = await linkFor(organizationId, teamId);
      expect(link.pending).toBe(false);
      expect(link.permissions).toEqual(PRESETS.editor);
    });

    it('lets a team accept on narrower terms, but never broader', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });

      await expect(
        respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, {
          accept: true,
          permissions: [...PRESETS.admin],
        }),
      ).rejects.toThrow(/broader/);

      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, {
        accept: true,
        permissions: [...PRESETS.viewer],
      });
      expect((await linkFor(organizationId, teamId)).permissions).toEqual(PRESETS.viewer);
    });

    it('drops the link when the team declines', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.viewer] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: false });
      expect(await linkFor(organizationId, teamId)).toBeNull();
    });

    it('leaves the consent with the team after acceptance', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });

      await updateTeamConsent(await asTeamAdmin(), teamId, organizationId, [...PRESETS.viewer]);
      expect((await linkFor(organizationId, teamId)).permissions).toEqual(PRESETS.viewer);

      // The organization cannot widen it back: an accepted team is no longer
      // invitable, so there is no second door.
      await expect(
        inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.admin] }),
      ).rejects.toThrow(/already in this organization/);
      expect((await linkFor(organizationId, teamId)).permissions).toEqual(PRESETS.viewer);
    });

    it('keeps a team to one organization at a time', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.viewer] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });

      await expect(
        inviteTeam(await asSsoAdmin(), otherOrganizationId, { teamId, permissions: [...PRESETS.viewer] }),
      ).rejects.toThrow(/another organization/);
    });

    it('withdraws everything when either side ends the link', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [] },
      ]);

      await leaveOrganization(await asTeamAdmin(), teamId, organizationId);
      expect(await linkFor(organizationId, teamId)).toBeNull();
      expect(await models.organizationIntegrationOverride.count()).toBe(0);
      expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual([]);

      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });
      await removeTeamFromOrganization(await asOrgAdmin(), organizationId, teamId);
      expect(await linkFor(organizationId, teamId)).toBeNull();
    });

    it('shows a team admin what has been proposed to their team', async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      const links = await listTeamOrganizationLinks(await asTeamAdmin(), teamId);

      expect(links).toHaveLength(1);
      expect(links[0].permissions).toEqual(PRESETS.editor);
      expect(links[0].pending).toBe(true);
      expect(await listTeamOrganizationLinks(await asOtherTeamAdmin(), otherTeamId)).toEqual([]);
    });
  });

  describe('membership', () => {
    const throwaway = async (name: string) => {
      const organization = await createOrganization(await asSsoAdmin(), { name });
      return organization.id as number;
    };

    afterEach(async () => {
      await models.organization.destroy({ where: { name: { [Op.like]: 'Ministry of Membership%' } } });
    });

    it('makes the creator an admin of what they created', async () => {
      const ssoAdmin = await asSsoAdmin();
      const id = await throwaway('Ministry of Membership');

      const members = await listOrganizationMembers(ssoAdmin, id);
      expect(members.map((member: any) => [member.userId, member.role])).toEqual([[ssoAdmin.user!.id, 'admin']]);
    });

    it('refuses to update an organization to a blank name', async () => {
      const ssoAdmin = await asSsoAdmin();
      const id = await throwaway('Ministry of Membership Name');

      await expect(updateOrganization(ssoAdmin, id, { name: '   ' })).rejects.toThrow(/organization name is required/);
      expect((await models.organization.findByPk(id))!.name).toBe('Ministry of Membership Name');
    });

    it('will not let the last admin go, and lets a second one in first', async () => {
      const ssoAdmin = await asSsoAdmin();
      const creatorId = ssoAdmin.user!.id as number;
      const id = await throwaway('Ministry of Membership Two');

      await expect(removeOrganizationMember(ssoAdmin, id, creatorId)).rejects.toThrow(/at least one admin/);
      await expect(updateOrganizationMemberRole(ssoAdmin, id, creatorId, 'member')).rejects.toThrow(
        /at least one admin/,
      );

      await addOrganizationMember(ssoAdmin, id, { idirEmail: ORG_ADMIN_EMAIL, role: 'admin' });
      await removeOrganizationMember(ssoAdmin, id, creatorId);

      const members = await listOrganizationMembers(ssoAdmin, id);
      expect(members.map((member: any) => member.role)).toEqual(['admin']);
    });

    it('lets an ordinary member be removed, and an admin be demoted while another remains', async () => {
      const ssoAdmin = await asSsoAdmin();
      const id = await throwaway('Ministry of Membership Three');
      const orgAdmin = await asOrgAdmin();

      await addOrganizationMember(ssoAdmin, id, { idirEmail: ORG_MEMBER_EMAIL, role: 'member' });
      await addOrganizationMember(ssoAdmin, id, { idirEmail: ORG_ADMIN_EMAIL, role: 'admin' });

      await removeOrganizationMember(ssoAdmin, id, (await asOrgMember()).user!.id as number);
      await updateOrganizationMemberRole(ssoAdmin, id, orgAdmin.user!.id as number, 'member');

      const members = await listOrganizationMembers(ssoAdmin, id);
      expect(members.map((member: any) => member.role).sort()).toEqual(['admin', 'member']);
    });
  });

  describe('what a consent reaches', () => {
    beforeAll(async () => {
      await inviteTeam(await asOrgAdmin(), organizationId, { teamId, permissions: [...PRESETS.editor] });
      await respondToOrganizationInvitation(await asTeamAdmin(), teamId, organizationId, { accept: true });
    });

    afterAll(async () => {
      await models.organizationTeam.destroy({ where: {} });
    });

    afterEach(async () => {
      await models.organizationIntegrationOverride.destroy({ where: {} });
    });

    it('gives both organization roles the same authority over an integration', async () => {
      expect(await resolvedOn(await asOrgAdmin(), teamIntegrationId)).toEqual(PRESETS.editor);
      expect(await resolvedOn(await asOrgMember(), teamIntegrationId)).toEqual(PRESETS.editor);
    });

    it('reaches the consenting team and no other', async () => {
      expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual(
        ids([{ id: teamIntegrationId }, { id: cappedIntegrationId }]),
      );
      expect(await resolvedOn(await asOrgAdmin(), otherTeamIntegrationId)).toEqual([]);
    });

    it('answers the dashboard list with the same rows', async () => {
      const session = await asOrgMember();
      const requests = await getRequests(session, session.user as User);
      expect(ids(requests)).toEqual(ids([{ id: teamIntegrationId }, { id: cappedIntegrationId }]));
      expect(requests.every((row: any) => row.get({ plain: true }).userTeamRole === null)).toBe(true);
    });

    /**
     * The row carries the authority it was admitted on, not only the team role
     * — which is null for everyone here. Without it the dashboard's guards
     * would read an organization member as having no say over a row it just
     * listed, and offer them every button.
     */
    it('hands the dashboard the authority each row was admitted on', async () => {
      const session = await asOrgMember();
      const requests = await getRequests(session, session.user as User);
      expect(requests.map((row: any) => row.get({ plain: true }).permissions)).toEqual([
        [...PRESETS.editor],
        [...PRESETS.editor],
      ]);
    });

    it('answers the role-management guard from the consent, not from a team role', async () => {
      // Editor reaches the integration but not its roles.
      expect(await isAllowedToManageRoles(await asOrgAdmin(), teamIntegrationId)).toBe(false);

      await updateTeamConsent(await asTeamAdmin(), teamId, organizationId, [...PRESETS['role-manager']]);
      try {
        expect(await isAllowedToManageRoles(await asOrgAdmin(), teamIntegrationId)).toBe(true);
        expect(await isAllowedToManageRoles(await asOrgMember(), teamIntegrationId)).toBe(true);
      } finally {
        await updateTeamConsent(await asTeamAdmin(), teamId, organizationId, [...PRESETS.editor]);
      }
    });

    it('names a joined team’s integrations, and no other team’s', async () => {
      const session = await asOrgAdmin();
      expect(ids(await listTeamIntegrations(session, organizationId, teamId))).toEqual(
        ids([{ id: teamIntegrationId }, { id: cappedIntegrationId }]),
      );

      // A team an organization may search for, and may invite, is still not one
      // whose integrations it may read.
      await expect(listTeamIntegrations(session, organizationId, otherTeamId)).rejects.toThrow(/not in this/);
      expect((await searchTeams(session, organizationId, 'unconsenting')).map((team: any) => team.id)).toEqual([
        otherTeamId,
      ]);
    });

    it('lists the consenting team’s integrations to an organization member', async () => {
      const session = await asOrgMember();
      expect(ids(await getIntegrations(session, teamId, session.user as User))).toEqual(
        ids([{ id: teamIntegrationId }, { id: cappedIntegrationId }]),
      );
      expect(await getIntegrations(session, otherTeamId, session.user as User)).toEqual([]);
    });

    it('caps one integration without touching the others', async () => {
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [...PRESETS.viewer] },
      ]);

      expect(await resolvedOn(await asOrgAdmin(), cappedIntegrationId)).toEqual(PRESETS.viewer);
      expect(await resolvedOn(await asOrgAdmin(), teamIntegrationId)).toEqual(PRESETS.editor);

      // Still readable, so still listed — and gone from the write list.
      expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual(
        ids([{ id: teamIntegrationId }, { id: cappedIntegrationId }]),
      );
      expect(await admitted(await asOrgAdmin(), 'integrations:write')).toEqual([teamIntegrationId]);
    });

    it('hides an integration whose override is empty', async () => {
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [] },
      ]);

      expect(await resolvedOn(await asOrgAdmin(), cappedIntegrationId)).toEqual([]);
      expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual([teamIntegrationId]);
    });

    it('cannot widen beyond the consent', async () => {
      await updateTeamConsent(await asTeamAdmin(), teamId, organizationId, [...PRESETS.viewer]);
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [...PRESETS.admin] },
      ]);

      expect(await resolvedOn(await asOrgAdmin(), cappedIntegrationId)).toEqual(PRESETS.viewer);

      await updateTeamConsent(await asTeamAdmin(), teamId, organizationId, [...PRESETS.editor]);
    });

    it('refuses an override naming another team’s integration', async () => {
      await expect(
        updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
          { requestId: otherTeamIntegrationId, permissions: [] },
        ]),
      ).rejects.toThrow(/owned by team/);
    });

    it('leaves an override behind by a reassignment inert', async () => {
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [] },
      ]);
      await models.request.update({ teamId: otherTeamId }, { where: { id: cappedIntegrationId } });

      try {
        // The row is out of the organization's reach entirely now — the override
        // is looked up through the integration's current team, and is not found.
        expect(await resolvedOn(await asOrgAdmin(), cappedIntegrationId)).toEqual([]);
        expect(await admitted(await asOrgAdmin(), 'integrations:read')).toEqual([teamIntegrationId]);
      } finally {
        await models.request.update({ teamId }, { where: { id: cappedIntegrationId } });
      }
    });

    it('never takes anything away from a team member', async () => {
      await updateIntegrationOverrides(await asTeamAdmin(), teamId, organizationId, [
        { requestId: cappedIntegrationId, permissions: [] },
      ]);

      const session = await asTeamAdmin();
      expect(await admitted(session, 'integrations:read')).toContain(cappedIntegrationId);
      expect(await resolvedOn(session, cappedIntegrationId)).toEqual(PRESETS['team-admin']);
    });
  });

  describe('the api account', () => {
    it('is held once per organization, as a team holds one', async () => {
      const session = await asOrgAdmin();
      const account = await createOrganizationApiAccount(session, organizationId);
      expect(account.clientId).toBe(`service-account-org-${organizationId}-${account.id}`);

      await expect(createOrganizationApiAccount(session, organizationId)).rejects.toThrow(/already has api account/);
      expect(ids(await listOrganizationApiAccounts(session, organizationId))).toEqual([account.id]);

      // Deleting it archives the row, which frees the slot again.
      await deleteOrganizationApiAccount(session, organizationId, account.id);
      expect(await listOrganizationApiAccounts(session, organizationId)).toEqual([]);
      await expect(getOrganizationApiAccountCredentials(session, organizationId, account.id)).rejects.toThrow(
        /could not find api account/,
      );
      await expect(updateOrganizationApiAccountSecret(session, organizationId, account.id)).rejects.toThrow(
        /could not find api account/,
      );
      await expect(deleteOrganizationApiAccount(session, organizationId, account.id)).rejects.toThrow(
        /could not find api account/,
      );

      const replacement = await createOrganizationApiAccount(session, organizationId);
      expect(replacement.id).not.toBe(account.id);
    });
  });
});
