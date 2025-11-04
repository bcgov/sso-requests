import { generateInvitationToken } from '@app/helpers/token';
import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_MEMBER_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
  postCompositeRoles,
  postRoles,
  postTeam,
} from './helpers/fixtures';
import {
  createBulkRoles,
  createCompositeRoles,
  createIntegration,
  deleteIntegration,
  deleteRole,
  getIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { createTeam, verifyTeamMember } from './helpers/modules/teams';
import { getAuthenticatedUser } from './helpers/modules/users';
import { cleanUpDatabaseTables } from './helpers/utils';
import { models } from '@app/shared/sequelize/models/models';
import { buildIntegration } from './helpers/modules/common';
import { Integration } from '@app/interfaces/Request';
import { createMockAuth } from './mocks/authenticate';

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

describe('create/manage integrations by authenticated user', () => {
  let teamId: number;

  let integrationId: number;

  let integration: Integration;

  const projectName: string = 'Team Integration';

  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await createTeam(postTeam);
    teamId = result.body.id;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('should verify team members added by the admin', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const userRes = await getAuthenticatedUser();
    const token = generateInvitationToken(userRes.body as any, teamId);
    await verifyTeamMember(token);
    const users = await models.usersTeam.findAll({ where: { userId: userRes.body.id, teamId } });
    expect(users[0].pending).not.toBeTruthy;
  });

  it('should allow admin to create an integration belonging to a team', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await createIntegration(
      getCreateIntegrationData({
        projectName,
        teamIntegration: true,
        teamId,
      }),
    );
    integrationId = result.body.id;
    integration = result.body;
    expect(result.status).toEqual(200);
    expect(result.body.projectName).toEqual(projectName);
  });

  it('should allow team members to view an integration belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const result = await getIntegration(integrationId);
    expect(result.status).toEqual(200);
    expect(result.body.id).toEqual(integrationId);
    expect(result.body.projectName).toEqual(projectName);
  });

  it('should allow team members to edit an integration belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);

    let result = await updateIntegration(
      getUpdateIntegrationData({
        integration,
        identityProviders: ['azureidir', 'bceidbasic'],
        envs: ['dev', 'test', 'prod'],
        publicAccess: true,
      }),
      true,
    );
    expect(result.status).toEqual(200);
    expect(result.body.id).toEqual(integrationId);
    expect(result.body.projectName).toEqual(projectName);
    expect(result.body.publicAccess).toBeTruthy();
  });

  it('should not allow team members to create role for integration belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const result = await createBulkRoles({
      integrationId,
      roles: postRoles,
    });
    expect(result.status).toEqual(401);
  });

  it('should not allow team members to update composite role for an existing role of an integration belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const result = await createCompositeRoles({
      integrationId,
      roleName: postRoles[0].name,
      environment: postRoles[0].envs[0],
      compositeRoleNames: postCompositeRoles,
    });
    expect(result.status).toEqual(401);
  });

  it('should not allow team members to delete role for integration belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const result = await deleteRole({
      integrationId,
      roleName: postRoles[0].name,
      environment: postRoles[0].envs[0],
    });
    expect(result.status).toEqual(401);
  });

  it('should not allow team members to delete a request belonging to a team', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_MEMBER_IDIR_EMAIL_01);
    const result = await deleteIntegration(integrationId);
    expect(result.status).toEqual(401);
  });

  it('should allow to create a successful saml integration', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integrationRes = await buildIntegration({
      projectName: 'SAML Integration',
      prodEnv: true,
      submitted: true,
      protocol: 'saml',
      teamId,
    });
    expect(integrationRes.status).toEqual(200);
    const int = integrationRes.body;
    expect(int.status).toEqual('applied');
    expect(int.protocol).toEqual('saml');
  });

  it('should not allow to create a saml integration with multiple idps', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    let integrationRes = await createIntegration(
      getCreateIntegrationData({
        projectName: 'Invalid: Multiple idps',
        teamIntegration: true,
        teamId,
      }),
    );

    expect(integrationRes.status).toEqual(200);
    integration = integrationRes.body;

    let updateIntegrationRes = await updateIntegration(
      getUpdateIntegrationData({
        integration,
        identityProviders: ['idir', 'azureidir', 'bceidbasic'],
        envs: ['dev', 'test', 'prod'],
        protocol: 'saml',
      }),
      true,
    );
    expect(updateIntegrationRes.status).toEqual(422);
  });
});
