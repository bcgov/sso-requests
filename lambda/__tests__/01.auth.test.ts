import { cleanUpDatabaseTables, clearMockAuth, createMockAuth } from './helpers/utils';
import { getAppApiHeartBeat } from './helpers/modules/common';
import { createIntegration, getIntegrations, getListOfIntegrations } from './helpers/modules/integrations';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => true),
  };
});

describe('authentication', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterEach(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    it('should get success response from heartbeat endpoint', async () => {
      const result = await getAppApiHeartBeat();
      expect(result.status).toEqual(200);
    });

    it('should reject the non-logged user to fetch list of integrations', async () => {
      const result = await getListOfIntegrations();
      expect(result.status).toEqual(401);
      expect(result.body.message).toContain('not authorized');
    });

    it('should allow the logged-in user to fetch its list of integrations', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await getIntegrations();
      expect(result.status).toEqual(200);
      expect(result.body).toEqual([]);
    });

    it('should reject the non-logged user to create an integration', async () => {
      clearMockAuth();
      const result = await createIntegration({});
      expect(result.status).toEqual(401);
      expect(result.body.message).toContain('not authorized');
    });

    it('should reject the logged-in user with DB constraint violations when creating an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createIntegration({});
      expect(result.status).toEqual(422);
      expect(result.body.message).toContain('notNull Violation');
    });
  } catch (err) {
    console.error('EXCEPTION : ', err);
  }
});
