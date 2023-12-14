import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, postTeam } from './helpers/fixtures';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import { createTeam } from './helpers/modules/teams';
import supertest from 'supertest';
import app from './helpers/server';
import { API_BASE_PATH } from './helpers/constants';
import { buildIntegration } from './helpers/modules/common';
import { findClientRole } from '@lambda-app/keycloak/users';
import { Integration } from 'app/interfaces/Request';
import {
  createIntegration,
  fetchMetrics,
  getIntegration,
  getIntegrations,
  updateIntegration,
} from './helpers/modules/integrations';

jest.mock('../app/src/grafana', () => {
  return {
    clientEventsAggregationQuery: jest.fn(() => Promise.resolve([{ event: 'LOGIN', count: 10 }])),
  };
});

jest.mock('@lambda-app/authenticate');
jest.mock('@lambda-app/github', () => {
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

jest.mock('@lambda-shared/utils/ches');

jest.mock('@lambda-app/authenticate');

jest.mock('@lambda-actions/authenticate', () => {
  return {
    authenticate: jest.fn(() => {
      return Promise.resolve(true);
    }),
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
        planned: true,
        applied: true,
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
