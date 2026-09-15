import supertest from 'supertest';
import app from '@/tests/helpers/server';
import { seedApiAccount, seedIntergrations, seedTeamAndMembers } from './helpers/seeder';
import { clearAuthContextCache } from '@/modules/authorization';

const API_BASE_PATH = '/api/v1';

/**
 * How an API account is resolved from its token, as opposed to what it may do
 * once resolved (team-scoping.test.ts, authorization.test.ts).
 */

let apiClientId: string;

jest.mock('@/modules/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve({
        success: true,
        data: { teamId: null, apiClientId },
        err: null,
      });
    }),
  };
});

describe('api account resolution', () => {
  let team: any;
  let integration: any;

  beforeAll(async () => {
    jest.clearAllMocks();
    team = await seedTeamAndMembers('account team', [
      { idirUserId: 'account-userid', email: 'account@gov.bc.ca', role: 'admin' },
    ]);
    integration = await seedIntergrations({ integrationName: 'Account Integration', teamId: team.id, submitted: true });
  });

  // Contexts are cached per client id for a TTL, so each block starts cold.
  beforeEach(() => clearAuthContextCache());

  describe('an account owned by a team', () => {
    beforeAll(async () => {
      apiClientId = (await seedApiAccount(team.id)).clientId;
    });

    it('reaches its team integration', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}`).expect(200);
    });

    it('rejects an unknown environment with 400 rather than 404', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations/${integration.id}/staging/roles`).expect(400);
    });
  });

  describe('an account with no owner', () => {
    beforeAll(async () => {
      apiClientId = (await seedApiAccount(null)).clientId;
    });

    it('is rejected as unauthorized rather than resolving to an empty context', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(401);
    });
  });

  describe('a token naming a client with no account row', () => {
    beforeAll(() => {
      apiClientId = 'service-account-does-not-exist';
    });

    it('is rejected as unauthorized', async () => {
      await supertest(app).get(`${API_BASE_PATH}/integrations`).expect(401);
    });
  });
});
