import { Integration } from '@app/interfaces/Request';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import * as requestQueryModule from '@app/queries/request';
import * as keycloakModule from '@app/controllers/keycloak';
import { getListOfDescrepencies } from '@app/controllers/requests';
import axios from 'axios';
import { models } from '@app/shared/sequelize/models/models';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('fetch descrepencies', () => {
  let integration: Integration;
  beforeAll(async () => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);

    const integrationRes = await buildIntegration({
      projectName: 'Test Request Monitor',
      prodEnv: true,
      submitted: true,
    });
    integration = integrationRes.body;
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('should send RC notification upon finding discrepancies', async () => {
    jest.spyOn(requestQueryModule, 'getAllActiveRequests').mockImplementation(() => {
      return Promise.resolve([
        {
          clientId: 'test-client-1',
          id: 1,
        },
        {
          clientId: 'test-client-2',
          id: 2,
        },
      ]);
    });

    jest.spyOn(keycloakModule, 'getKeycloakClientsByEnv').mockImplementation(() => {
      return Promise.resolve([
        {
          clientId: 'test-client-1',
          id: 1,
          enabled: true,
        },
      ]) as any;
    });

    jest.spyOn(axios, 'post').mockImplementation(() => {
      return Promise.resolve({
        status: 200,
        data: {
          message: 'Success',
        },
      });
    });

    getListOfDescrepencies();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Check if RC notification was sent
    expect(axios.post).toHaveBeenCalled();
  });

  it('Should not include draft or failed requests in the active requests list', async () => {
    jest.restoreAllMocks();
    await cleanUpDatabaseTables();

    // Setup draft and failed requests in dev
    await models.request.create({ status: 'draft', projectName: 'draft', environments: ['dev'] });
    await models.request.create({ status: 'applyFailed', projectName: 'applyFailed', environments: ['dev'] });

    const activeIntegrations = await requestQueryModule.getAllActiveRequests('dev');
    // Integrations are not counted as active
    expect(activeIntegrations.length).toBe(0);
  });
});
