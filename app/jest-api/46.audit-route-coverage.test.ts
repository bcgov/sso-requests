import { PRESETS } from '@sso/authz';
import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import organizationsHandler from '@app/pages/api/organizations';
import organizationHandler from '@app/pages/api/organizations/[orgId]';
import membersHandler from '@app/pages/api/organizations/[orgId]/members';
import memberHandler from '@app/pages/api/organizations/[orgId]/members/[userId]';
import orgTeamsHandler from '@app/pages/api/organizations/[orgId]/teams';
import orgTeamHandler from '@app/pages/api/organizations/[orgId]/teams/[teamId]';
import orgApiAccountsHandler from '@app/pages/api/organizations/[orgId]/api-accounts';
import orgApiAccountHandler from '@app/pages/api/organizations/[orgId]/api-accounts/[accountId]';
import orgApiAccountCredentialsHandler from '@app/pages/api/organizations/[orgId]/api-accounts/[accountId]/credentials';
import teamOrganizationHandler from '@app/pages/api/teams/[teamId]/organizations/[orgId]';
import teamOverridesHandler from '@app/pages/api/teams/[teamId]/organizations/[orgId]/overrides';
import teamServiceAccountsHandler from '@app/pages/api/teams/[teamId]/service-accounts';
import teamCredentialsHandler from '@app/pages/api/teams/[teamId]/service-accounts/[saId]/credentials';
import requestMetadataHandler from '@app/pages/api/request-metadata';
import roleReplicateHandler from '@app/pages/api/keycloak/role-replicate';

// Write routes the other suites only reach by calling their controllers, exercised here through HTTP so the
// audit coverage check (zz.audit-coverage.test.ts) sees each one record its action.

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return { ...original, keycloakClient: jest.fn(() => Promise.resolve(true)) };
});

jest.mock('@app/keycloak/installation', () => ({
  generateInstallation: jest.fn(() => Promise.resolve({ credentials: { secret: 's3cret' } })),
  updateClientSecret: jest.fn(() => Promise.resolve()),
}));

jest.mock('@app/keycloak/roleReplication', () => ({
  ...jest.requireActual('@app/keycloak/roleReplication'),
  planRoleReplication: jest.fn(() =>
    Promise.resolve({
      alreadyReplicated: [],
      pending: [],
      resolveTargets: jest.fn(() => Promise.resolve({ pending: [], notFound: [] })),
      replicate: jest.fn(),
    }),
  ),
}));

const asSsoAdmin = () => createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
const asTeamAdmin = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

const actions = async (where: object) =>
  (await models.event.findAll({ where, order: [['id', 'ASC']], raw: true })).map(
    (event: any) => `${event.eventCode}:${event.outcome}`,
  );

describe('audited write routes reached through HTTP', () => {
  beforeAll(async () => {
    await cleanUpDatabaseTables();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('records an organization through its whole life', async () => {
    asTeamAdmin();
    const teamId = (await createTeam({ name: 'org route team', members: [] })).body.id;
    const org = `${API_BASE_PATH}/organizations`;

    // Organizations add people who have signed in before.
    await models.user.create({ idirEmail: TEAM_MEMBER_IDIR_EMAIL_01, idirUserid: 'ORG_ROUTE_MEMBER' });

    asSsoAdmin();
    const created = await testClient(organizationsHandler).post(org).send({ name: 'Ministry of Routes' });
    expect(created.status).toBe(200);
    const orgId = created.body.id;
    expect(
      (await testClient(organizationHandler).put(`${org}/${orgId}`).send({ name: 'Ministry of Paths' })).status,
    ).toBe(200);

    const added = await testClient(membersHandler)
      .post(`${org}/${orgId}/members`)
      .send({ idirEmail: TEAM_MEMBER_IDIR_EMAIL_01, role: 'member' });
    expect(added.status).toBe(200);
    const memberId = added.body.userId;
    expect(
      (await testClient(memberHandler).put(`${org}/${orgId}/members/${memberId}`).send({ role: 'admin' })).status,
    ).toBe(200);

    // The negotiation, from both sides.
    const invite = () =>
      testClient(orgTeamsHandler)
        .post(`${org}/${orgId}/teams`)
        .send({ teamId, permissions: [...PRESETS.editor] });
    const teamLink = `${API_BASE_PATH}/teams/${teamId}/organizations/${orgId}`;
    expect((await invite()).status).toBe(200);
    asTeamAdmin();
    expect((await testClient(teamOrganizationHandler).post(teamLink).send({ accept: false })).status).toBe(200);
    asSsoAdmin();
    expect((await invite()).status).toBe(200);
    asTeamAdmin();
    expect((await testClient(teamOrganizationHandler).post(teamLink).send({ accept: true })).status).toBe(200);
    expect(
      (
        await testClient(teamOrganizationHandler)
          .put(teamLink)
          .send({ permissions: [...PRESETS.viewer] })
      ).status,
    ).toBe(200);
    expect((await testClient(teamOverridesHandler).put(`${teamLink}/overrides`).send({ overrides: [] })).status).toBe(
      200,
    );
    expect((await testClient(teamOrganizationHandler).delete(teamLink)).status).toBe(200);

    asSsoAdmin();
    expect((await invite()).status).toBe(200);
    expect((await testClient(orgTeamHandler).delete(`${org}/${orgId}/teams/${teamId}`)).status).toBe(200);

    // The organization's API account.
    const account = await testClient(orgApiAccountsHandler).post(`${org}/${orgId}/api-accounts`);
    expect(account.status).toBe(200);
    const accountPath = `${org}/${orgId}/api-accounts/${account.body.id}`;
    expect((await testClient(orgApiAccountCredentialsHandler).get(`${accountPath}/credentials`)).status).toBe(200);
    expect((await testClient(orgApiAccountCredentialsHandler).put(`${accountPath}/credentials`)).status).toBe(200);
    expect((await testClient(orgApiAccountHandler).delete(accountPath)).status).toBe(200);

    expect((await testClient(memberHandler).delete(`${org}/${orgId}/members/${memberId}`)).status).toBe(200);
    expect((await testClient(organizationHandler).delete(`${org}/${orgId}`)).status).toBe(200);

    const recorded = await actions({ organizationId: orgId, requestId: null });
    expect(recorded).toEqual([
      // The creator joins as its first admin, in the same transaction as the creation.
      'organization-member-add:success',
      'organization-create:success',
      'organization-update:success',
      'organization-member-add:success',
      'organization-member-role-update:success',
      'organization-team-invite:success',
      'organization-team-decline:success',
      'organization-team-invite:success',
      'organization-team-join:success',
      'organization-consent-update:success',
      'organization-overrides-update:success',
      'organization-team-leave:success',
      'organization-team-invite:success',
      'organization-team-leave:success',
      'organization-member-remove:success',
      'organization-delete:success',
    ]);
  });

  it('records rotating a team api account secret', async () => {
    asTeamAdmin();
    const teamId = (await createTeam({ name: 'secret route team', members: [] })).body.id;
    const account = await testClient(teamServiceAccountsHandler).post(
      `${API_BASE_PATH}/teams/${teamId}/service-accounts`,
    );

    const rotated = await testClient(teamCredentialsHandler).put(
      `${API_BASE_PATH}/teams/${teamId}/service-accounts/${account.body.id}/credentials`,
    );

    expect(rotated.status).toBe(200);
    expect(await actions({ requestId: account.body.id, eventCode: 'secret-rotate' })).toEqual([
      'secret-rotate:requested',
      'secret-rotate:success',
    ]);
  });

  it('records an admin setting an integration status directly', async () => {
    asTeamAdmin();
    const integration = (await buildIntegration({ projectName: 'status route', submitted: true })).body;

    asSsoAdmin();
    const response = await testClient(requestMetadataHandler)
      .put(`${API_BASE_PATH}/request-metadata`)
      .send({ id: integration.id, status: 'applyFailed' });

    expect(response.status).toBe(200);
    const [event] = await models.event.findAll({
      where: { requestId: integration.id, eventCode: 'request-status-update' },
      raw: true,
    });
    expect(event).toMatchObject({ outcome: 'success', details: { before: 'applied', after: 'applyFailed' } });
  });

  it('records a role replication', async () => {
    asTeamAdmin();
    const integration = (await buildIntegration({ projectName: 'replicate route', submitted: true })).body;
    await models.request.update({ devIdps: ['idir', 'azureidir'] }, { where: { id: integration.id } });

    const response = await testClient(roleReplicateHandler)
      .post(`${API_BASE_PATH}/keycloak/role-replicate`)
      .send({ integrationId: integration.id, environment: 'dev', roleName: 'editor' });

    expect(response.status).toBe(200);
    expect(await actions({ requestId: integration.id, eventCode: 'role-replicate' })).toEqual([
      'role-replicate:requested',
      'role-replicate:success',
    ]);
  });
});
