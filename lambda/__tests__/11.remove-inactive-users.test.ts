import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import {
  SSO_TRAINING_IDIR_EMAIL,
  SSO_TRAINING_IDIR_USER,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  postTeam,
} from './helpers/fixtures';
import { createTeam, getMembersOfTeam } from './helpers/modules/teams';
import { deleteInactiveUsers, getAuthenticatedUser } from './helpers/modules/users';
import { Integration } from 'app/interfaces/Request';
import { buildIntegration } from './helpers/modules/common';
import { models } from '@lambda-shared/sequelize/models/models';

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

jest.mock('../app/src/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
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

describe('users and teams', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });
    let teamId: number;
    let integration: Integration;

    it('should allow training user to login', async () => {
      createMockAuth(SSO_TRAINING_IDIR_USER, SSO_TRAINING_IDIR_EMAIL);
      const result = await getAuthenticatedUser();
      expect(result.status).toEqual(200);
    });

    it('should create a team by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const createTeamRes = await createTeam({ ...postTeam, members: [] });
      teamId = createTeamRes.body.id;
      expect(createTeamRes.status).toEqual(200);
      expect(createTeamRes.body.name).toEqual(postTeam.name);
    });

    it('should create an integration by authenticated user', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      let integrationRes = await buildIntegration({
        projectName: 'Delete Inactive Users',
        bceid: false,
        prodEnv: false,
        submitted: true,
        planned: true,
        applied: true,
      });
      expect(integrationRes.status).toEqual(200);
      integration = integrationRes.body;
    });

    it('should add sso training account after removing the only team admin', async () => {
      const deleteResponse = await deleteInactiveUsers(TEAM_ADMIN_IDIR_USERID_01);
      expect(deleteResponse.status).toEqual(204);
    });

    it('should verify the admin status of training user', async () => {
      createMockAuth(SSO_TRAINING_IDIR_USER, SSO_TRAINING_IDIR_EMAIL);
      const membersRes = await getMembersOfTeam(teamId);
      expect(membersRes.status).toEqual(200);
      expect(membersRes.body.length).toEqual(1);
      expect(membersRes.body[0].idirUserid).toEqual(SSO_TRAINING_IDIR_USER);
    });

    it('should verify the transition of integration to training user', async () => {
      createMockAuth(SSO_TRAINING_IDIR_USER, SSO_TRAINING_IDIR_EMAIL);
      const user = await models.user.findOne({ where: { idirUserid: SSO_TRAINING_IDIR_USER }, raw: true });
      const int = await models.request.findOne({ where: { id: integration.id }, raw: true });
      expect(int.userId).toEqual(user.id);
    });
  } catch (err) {
    console.error('EXCEPTION : ', err);
  }
});
