import { Integration } from 'app/interfaces/Request';
import {
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
  getCreateIntegrationData,
  getUpdateIntegrationData,
} from './helpers/fixtures';
import { createIntegration, getIntegration, getIntegrations, updateIntegration } from './helpers/modules/integrations';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { sendEmail } from '@lambda-shared/utils/ches';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => ({ status: 204 })),
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
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

describe('authentication', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    it('should reject the requests without valid auth token', async () => {
      const result = await getIntegrations();
      expect(result.status).toEqual(401);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});

describe('create/manage integration by authenticated user', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    const projectName: string = 'User Integration';

    let integration: Integration;

    it('should create integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createIntegration(getCreateIntegrationData({ projectName }));
      integration = result.body;
      expect(result.status).toEqual(200);
      expect(result.body.projectName).toEqual(projectName);
      expect(result.body.teamId).toBeNull;
    });

    it('should retrieve all the integrations', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegrations();
      expect(result.status).toEqual(200);
      expect(result.body.length).toBe(1);
    });

    it('should retrieve an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegration(integration.id);
      expect(result.status).toEqual(200);
      expect(result.body.id).toEqual(integration.id);
      expect(result.body.projectName).toEqual(projectName);
    });

    it('should update an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await updateIntegration(getUpdateIntegrationData({ integration }), true);
      expect(result.status).toEqual(200);
      expect(result.body.id).toEqual(integration.id);
      expect(sendEmail).toHaveBeenCalled();
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});
