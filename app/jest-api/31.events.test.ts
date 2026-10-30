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
import { models } from '@app/shared/sequelize/models/models';

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

    // The update shows its operation's outcome, with its own changes; the engine's rows are not listed.
    const [update] = eventsResponse.body.rows;
    expect(update.outcome).toBe('success');
    expect(update.details.changes.length).toBeGreaterThan(0);

    // Until the engine answers it, the update is still `requested`.
    await models.event.destroy({
      where: { operationId: update.operationId, eventCode: 'request-update', outcome: 'success' },
    });
    eventsResponse = await getRequestScopedEvents(integration.body.id);
    expect(eventsResponse.body.rows).toHaveLength(1);
    expect(eventsResponse.body.rows[0]).toMatchObject({ id: update.id, outcome: 'requested' });

    // User not owning integration rejected
    createMockAuth('other_user_id', 'other_user_email');
    eventsResponse = await getRequestScopedEvents(integration.body.id);
    expect(eventsResponse.status).toBe(403);
  });
});
