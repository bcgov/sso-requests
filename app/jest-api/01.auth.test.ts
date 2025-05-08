import { getAppApiHeartBeat } from './helpers/modules/common';
import { createIntegration, getIntegrations, getListOfIntegrations } from './helpers/modules/integrations';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { clearMockAuth, createMockAuth } from './__mocks__/authenticate';
import { cleanUpDatabaseTables, generateRandomName } from './helpers/utils';

jest.mock('@app/controllers/requests', () => {
  const original = jest.requireActual('@app/controllers/requests');
  return {
    ...original,
    processIntegrationRequest: jest.fn(() => true),
  };
});

describe('authentication', () => {
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    afterEach(async () => {
      jest.clearAllMocks();
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
      const result = await createIntegration({ projectName: generateRandomName() });
      expect(result.status).toEqual(401);
      expect(result.body.message).toContain('not authorized');
    });

    it('should reject the logged-in user with DB constraint violations when creating an integration', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await createIntegration({});
      expect(result.status).toEqual(400);
      expect(JSON.stringify(result.body.message)).toContain('notNull Violation');
    });
  } catch (err) {
    console.error('EXCEPTION : ', err);
  }
});
