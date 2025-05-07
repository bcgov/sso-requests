import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { getUpdateIntegrationData } from './helpers/fixtures';
import { models } from '@app/shared/sequelize/models/models';
import { queryGrafana } from '@app/utils/grafana';
import { EVENTS } from '@app/shared/enums';
import * as rateLimiters from '@app/utils/rate-limiters';
import { getLogs } from './helpers/modules/logs';

jest.mock('@app/utils/grafana', () => {
  return {
    queryGrafana: jest.fn(() => Promise.resolve(['{"log": "log"}', '{"log": "log"}'])),
  };
});

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/utils/rate-limiters', () => {
  return {
    logsRateLimiter: jest.fn(() => Promise.resolve(true)),
  };
});

const AUTHENTICATED_TEAM_ID = 1;
const UNAUTHENTICATED_TEAM_ID = 2;
const teamAuthResponse = {
  success: true,
  data: {
    teamId: AUTHENTICATED_TEAM_ID,
  },
};

const MOCK_USER_ID = -1;
const MOCK_USER_EMAIL = 'test@user.com';
const INTEGRATION_ID = -1;
const integration = getUpdateIntegrationData({ integration: { projectName: 'test_project' } });

// Create integration owned by mock user to test against
const setupIntegrationAndUser = async () => {
  await models.user.create({
    id: MOCK_USER_ID,
    idirEmail: MOCK_USER_EMAIL,
  });
  await models.request.create({
    ...integration,
    id: INTEGRATION_ID,
    usesTeam: false,
    userId: MOCK_USER_ID,
  });
};

describe('Fetch SSO Logs', () => {
  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  // A valid query string to use
  const queryString = `env=dev&start=2020-10-10&end=2020-10-12`;

  it('Handles validation correctly for directly owned requests', async () => {
    await setupIntegrationAndUser();
    // Create session with a different user login, expect 401
    createMockAuth('1', 'wrong@user.com');
    let response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(403);

    // Create session with actual user, expect 200
    createMockAuth('2', MOCK_USER_EMAIL);
    response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(200);
  });

  it('Handles authentication correctly for team ownership', async () => {
    const TEAM_MEMBER_EMAIL = 'team@member.com';
    const NOT_A_TEAM_EMAIL = 'not_a_team@member.com';
    const INTEGRATION_ID = -1;

    await models.team.create({
      id: -1,
      name: 'test_team',
    });
    await models.user.create({
      id: -2,
      idirEmail: TEAM_MEMBER_EMAIL,
    });
    await models.request.create({
      ...integration,
      id: INTEGRATION_ID,
      usesTeam: true,
      teamId: -1,
    });
    await models.usersTeam.create({
      userId: -2,
      teamId: -1,
      role: 'member',
      pending: false,
    });

    // Create session as team member, expect 200
    createMockAuth('1', TEAM_MEMBER_EMAIL);
    let response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(200);

    // Create session not on the team. Expect 401
    createMockAuth('2', NOT_A_TEAM_EMAIL);
    response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(403);
  });

  it('Responds with 400 if supplied query parameters are wrong', async () => {
    await setupIntegrationAndUser();

    // Covering some common invalid cases
    const invalidParams = [
      // Missing params
      '',
      'env=dev',
      'env=dev&start=2022-10-10',
      // Invalid values
      'env=development&start=2022-10-10&end=2022-10-10',
      'env=dev&start=somedate&end=2022-10-10',
      'env=dev&start=2022-10-10&end=anotherDate',
      // Range too large
      'env=dev&start=2022-10-10&end=2022-12-12',
      // Start date later than end date
      'env=dev&start=2022-10-02&end=2022-10-01',
    ];

    const validParams = [
      'env=dev&start=2022-10-10&end=2022-10-11',
      'env=test&start=2022-10-10&end=2022-10-11',
      'env=prod&start=2022-10-10&end=2022-10-11',
      'env=dev&start=2022-10-10&end=2022-10-10T12:10:10',
      'env=dev&start=2022-10-10T10:10:10&end=2022-10-10T10:10:11',
    ];

    createMockAuth('2', MOCK_USER_EMAIL);
    for (const params of invalidParams) {
      const response = await getLogs(INTEGRATION_ID, params);
      expect(response.status).toBe(400);
    }

    for (const params of validParams) {
      const response = await getLogs(INTEGRATION_ID, params);
      expect(response.status).toBe(200);
    }
  });

  it('Returns 500 if unexpected error when fetching logs', async () => {
    await setupIntegrationAndUser();
    (queryGrafana as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('err')));

    const response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(500);
    const event = await models.event.findOne({
      where: {
        eventCode: EVENTS.LOGS_DOWNLOADED_FAILURE,
        requestId: INTEGRATION_ID,
      },
    });
    expect(event).not.toBeNull();
  });

  it('Returns the expected logs in JSON array if successful', async () => {
    await setupIntegrationAndUser();

    const response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ log: 'log' }, { log: 'log' }]);
    const event = await models.event.findOne({
      where: {
        eventCode: EVENTS.LOGS_DOWNLOADED_SUCCESS,
        requestId: INTEGRATION_ID,
      },
    });
    expect(event).not.toBeNull();
  });

  it('Return 429 if too many requests', async () => {
    await setupIntegrationAndUser();
    jest.spyOn(rateLimiters, 'logsRateLimiter').mockImplementationOnce(async (_, res) => {
      return await res.status(429).send({ message: 'Rate limit exceeded' });
    });
    const response = await getLogs(INTEGRATION_ID, queryString);

    expect(response.status).toBe(429);
  });
});
