import { generateInvitationToken } from '@lambda-app/helpers/token';
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
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { models } from '@lambda-shared/sequelize/models/models';
import { buildIntegration, applyIntegration } from './helpers/modules/common';
import { Integration } from 'app/interfaces/Request';

jest.mock('../app/src/authenticate');

jest.mock('../actions/src/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve(true);
    }),
  };
});

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
    closeOpenPullRequests: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('../actions/src/github', () => {
  return {
    mergePR: jest.fn(),
  };
});

jest.mock('../app/src/utils/helpers', () => {
  const actual = jest.requireActual('../app/src/utils/helpers');
  return {
    ...actual,
    getUsersTeams: jest.fn(() => []),
  };
});

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

describe('create/manage integrations by authenticated user', () => {
  try {
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
      const result = await updateIntegration({
        id: integrationId,
        publicAccess: true,
      });
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
        planned: true,
        applied: true,
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

    it('should not allow to update project name of a saml integration in submitted state', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await createIntegration(
        getCreateIntegrationData({
          projectName: 'Project name at draft',
          teamIntegration: true,
          teamId,
        }),
      );

      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      expect(integration.status).toEqual('draft');

      let updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          projectName: 'Project name before submit',
          integration,
          identityProviders: ['idir'],
          envs: ['dev', 'test', 'prod'],
          protocol: 'saml',
        }),
        true,
      );
      expect(updateIntegrationRes.status).toEqual(200);
      integration = updateIntegrationRes.body;
      expect(integration.status).toEqual('submitted');

      integrationRes = await applyIntegration({ integrationId: integration.id, planned: true, applied: true });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
      expect(integration.status).toEqual('applied');

      const projNameAfterApplied = 'Project name after applied';

      updateIntegrationRes = await updateIntegration(
        getUpdateIntegrationData({
          projectName: projNameAfterApplied,
          integration,
        }),
        true,
      );
      expect(updateIntegrationRes.status).toEqual(200);
      integration = updateIntegrationRes.body;
      expect(integration.projectName).not.toEqual(projNameAfterApplied);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});
