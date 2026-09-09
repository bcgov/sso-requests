import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  getUpdateIntegrationData,
} from './helpers/fixtures';
import { updateIntegration } from './helpers/modules/integrations';
import { createTeam } from './helpers/modules/teams';
import { buildIntegration } from './helpers/modules/common';
import { getAuthenticatedUser } from './helpers/modules/users';
import { cleanUpDatabaseTables } from './helpers/utils';
import { models } from '@app/shared/sequelize/models/models';
import { createMockAuth } from './mocks/authenticate';
import { Integration } from '@app/interfaces/Request';

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

/**
 * Covers the scenario where an organization admin has editor-level access to an integration owned by a team
 * they are not a member of. They must be able to keep submitting the integration against its existing team,
 * but must not be able to reassign it to a different team.
 */
describe('editing team integrations via organization-derived access', () => {
  let teamId: number;
  let integration: Integration;
  let orgAdminUserId: number;

  beforeAll(async () => {
    jest.clearAllMocks();

    // TEAM_ADMIN_IDIR_USERID_01 owns the team and the integration natively. TEAM_MEMBER_IDIR_USERID_01 is
    // deliberately excluded from team membership so the only access they'll have is via the organization.
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const teamRes = await createTeam({ name: 'team_01', members: [] });
    teamId = teamRes.body.id;

    const buildRes = await buildIntegration({ projectName: 'Org Admin Editing', teamId, submitted: true });
    expect(buildRes.status).toEqual(200);
    integration = buildRes.body;

    // TEAM_MEMBER_IDIR_USERID_01 is an organization admin but not a member of the team above.
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const orgAdminUserRes = await getAuthenticatedUser();
    orgAdminUserId = orgAdminUserRes.body.id;

    const organization = await models.organization.create({ name: 'Org With Editors' });
    await models.organizationMember.create({
      organizationId: organization.id,
      userId: orgAdminUserId,
      role: 'admin',
      pending: false,
    });
    const organizationTeam = await models.organizationTeam.create({
      organizationId: organization.id,
      teamId,
      pending: false,
    });
    await models.organizationTeamCeiling.create({
      organizationTeamId: organizationTeam.id,
      level: 'editor',
    });
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('allows the organization admin to submit the integration while keeping its existing team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const updateableIntegration = getUpdateIntegrationData({ integration });
    const updateRes = await updateIntegration({ ...updateableIntegration, projectName: 'Org Admin Edited' }, true);

    expect(updateRes.status).toEqual(200);
    expect(updateRes.body.projectName).toEqual('Org Admin Edited');
    expect(updateRes.body.teamId).toEqual(teamId);
  });

  it('does not allow the organization admin to reassign the integration to a different team', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const otherTeamRes = await createTeam({ name: 'other_team', members: [] });
    const otherTeamId = otherTeamRes.body.id;

    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const updateableIntegration = getUpdateIntegrationData({ integration });
    const updateRes = await updateIntegration({ ...updateableIntegration, teamId: String(otherTeamId) }, true);

    expect(updateRes.status).toEqual(200);
    // The server silently preserves the original team for organization-only access rather than honoring the reassignment.
    expect(updateRes.body.teamId).toEqual(teamId);
  });
});
