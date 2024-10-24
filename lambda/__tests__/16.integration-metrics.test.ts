import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, postTeam } from './helpers/fixtures';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { buildIntegration } from './helpers/modules/common';
import { Integration } from 'app/interfaces/Request';
import { fetchMetrics } from './helpers/modules/integrations';

jest.mock('../app/src/grafana', () => {
  return {
    clientEventsAggregationQuery: jest.fn(() => Promise.resolve([{ event: 'LOGIN', count: 10 }])),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('create/manage integration by authenticated user', () => {
  let integration: Integration;
  try {
    beforeAll(async () => {
      jest.clearAllMocks();
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

      const integrationRes = await buildIntegration({
        projectName: 'TEST CSS Metrics Tab',
        prodEnv: true,
        submitted: true,
      });
      integration = integrationRes.body;
    });

    afterAll(async () => {
      await cleanUpDatabaseTables();
    });

    it('should reject if date inputs are not valid', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await fetchMetrics(integration?.id, '', '', 'dev');
      expect(result.status).toEqual(400);
    });

    it('should reject if start date is greater than end date', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await fetchMetrics(integration?.id, '2023-01-20', '2023-01-10', 'dev');
      expect(result.status).toEqual(400);
    });

    it('should reject if end date is a future date', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await fetchMetrics(integration?.id, '2023-01-20', '9999-12-01', 'dev');
      expect(result.status).toEqual(400);
    });

    it('should reject if env input is not valid', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await fetchMetrics(integration?.id, '2023-01-01', '2023-01-10', 'fake');
      expect(result.status).toEqual(400);
    });

    it('should fetch metrics if all the inputs are valid', async () => {
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
      const result = await fetchMetrics(integration?.id, '2023-01-01', '2023-01-10', 'dev');
      expect(result.status).toEqual(200);
      expect(result.body.length).toEqual(1);
    });
  } catch (err) {
    console.error('EXCEPTION: ', err);
  }
});
