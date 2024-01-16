import { Integration } from 'app/interfaces/Request';
import { TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { cleanUpDatabaseTables, createMockAuth } from './helpers/utils';
import * as requestMonitorModule from '../request-monitor/src/main';

jest.mock('../app/src/authenticate');

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('../app/src/keycloak/integration', () => {
  const original = jest.requireActual('../app/src/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('../request-monitor/src/keycloak', () => {
  return {
    getKeycloakClientsByEnv: jest.fn(() => Promise.resolve([{ clientId: 'test-request-monitor-1', enabled: false }])),
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
    const kcRcNotifySpy = jest.spyOn(requestMonitorModule, 'sendRcNotification');
    kcRcNotifySpy.mockImplementation(() => Promise.resolve());
    await requestMonitorModule.handler();
    expect(kcRcNotifySpy).toHaveBeenCalledTimes(1);
  });
});
