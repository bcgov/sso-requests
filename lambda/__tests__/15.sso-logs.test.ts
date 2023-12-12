import app from './helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { getUpdateIntegrationData } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';
import { queryGrafana } from '../app/src/grafana';

jest.mock('../app/src/authenticate');
jest.mock('../app/src/grafana', () => {
  return {
    queryGrafana: jest.fn(() => Promise.resolve(['log', 'log'])),
  };
});

describe('Fetch SSO Logs', () => {
  const integration = getUpdateIntegrationData({ integration: { projectName: 'test_project' } });

  afterEach(async () => {
    await cleanUpDatabaseTables();
  });

  const MOCK_USER_ID = -1;
  const MOCK_USER_EMAIL = 'test@user.com';
  const INTEGRATION_ID = -1;

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

  // A valid query string to use
  const queryString = `env=dev&start=2020-10-10&end=2020-10-12&eventType=LOGIN`;

  it('Handles validation correctly for directly owned requests', async () => {
    await setupIntegrationAndUser();
    // Create session with a different user login, expect 401
    createMockAuth('1', 'wrong@user.com');
    let response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(401);

    // Create session with actual user, expect 200
    createMockAuth('2', MOCK_USER_EMAIL);
    response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

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
    let response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);

    // Create session not on the team. Expect 401
    createMockAuth('2', NOT_A_TEAM_EMAIL);
    response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(401);
  });

  it('Responds with 400 if supplied query parameters are wrong', async () => {
    await setupIntegrationAndUser();

    // Covering some common invalid cases
    const invalidParams = [
      // Missing params
      '',
      'env=dev',
      'env=dev&eventType=LOGIN',
      'env=dev&eventType=LOGIN&start=2022-10-10',
      // Invalid values
      'env=development&eventType=LOGIN&start=2022-10-10&end=2022-10-10',
      'env=dev&eventType=MISSING&start=2022-10-10&end=2022-10-10',
      'env=dev&eventType=LOGIN&start=somedate&end=2022-10-10',
      'env=dev&eventType=LOGIN&start=2022-10-10&end=anotherDate',
      'env=dev&eventType=LOGIN&start=2022-14-10&end=2022-10-42',
    ];

    const validParams = [
      'env=dev&eventType=LOGIN&start=2022-10-10&end=2022-10-10',
      'env=test&eventType=LOGIN&start=2022-10-10&end=2022-10-10',
      'env=prod&eventType=LOGIN&start=2022-10-10&end=2022-10-10',
      'env=dev&eventType=REFRESH_TOKEN&start=2022-10-10&end=2022-10-10',
      'env=dev&eventType=CODE_TO_TOKEN&start=2022-12-10&end=2022-10-10',
    ];

    createMockAuth('2', MOCK_USER_EMAIL);
    for (const params of invalidParams) {
      const response = await supertest(app)
        .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${params}`)
        .set('Accept', 'application/json');
      expect(response.status).toBe(400);
    }

    for (const params of validParams) {
      const response = await supertest(app)
        .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${params}`)
        .set('Accept', 'application/json');
      expect(response.status).toBe(200);
    }
  });

  it('Returns 500 if unexpected error when fetching logs', async () => {
    await setupIntegrationAndUser();
    (queryGrafana as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('err')));

    const response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(500);
  });

  it('Returns the expected logs in JSON array if successful', async () => {
    await setupIntegrationAndUser();

    const response = await supertest(app)
      .get(`${APP_BASE_PATH}/requests/${INTEGRATION_ID}/logs?${queryString}`)
      .set('Accept', 'application/json');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual(['log', 'log']);
  });
});
