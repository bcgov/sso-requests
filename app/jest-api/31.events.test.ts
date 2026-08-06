import {
  TEAM_ADMIN_IDIR_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_MEMBER_IDIR_USERID_01,
  getUpdateIntegrationData,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { getRequestScopedEvents, updateIntegration } from './helpers/modules/integrations';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Request Events', () => {
  beforeAll(async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'test';
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    await cleanUpDatabaseTables();
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Can fetch update events for non-admin users scoped to ownership', async () => {
    createMockAuth(TEAM_MEMBER_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const integration = await buildIntegration({
      projectName: 'test',
      submitted: true,
    });

    let eventsResponse = await getRequestScopedEvents(integration.body.id);
    expect(eventsResponse.status).toBe(200);
    // Only update events should be shown in change history
    expect(eventsResponse.body.rows.length).toBe(0);

    // Create an update event
    await updateIntegration(getUpdateIntegrationData({ integration: integration.body, projectName: 'test 2' }), true);
    eventsResponse = await getRequestScopedEvents(integration.body.id);
    expect(eventsResponse.status).toBe(200);
    expect(eventsResponse.body.rows.length).toBe(1);

    // User not owning integration rejected
    createMockAuth('other_user_id', 'other_user_email');
    eventsResponse = await getRequestScopedEvents(integration.body.id);
    expect(eventsResponse.status).toBe(403);
  });
});
