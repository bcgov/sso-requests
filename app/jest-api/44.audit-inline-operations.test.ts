import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import { createIntegration, getEventsByRequestId } from './helpers/modules/integrations';
import { getCreateIntegrationData } from './helpers/fixtures';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { generateInstallation, updateClientSecret } from '@app/keycloak/installation';
import { createRole } from '@app/keycloak/users';
import installationHandler from '@app/pages/api/installation';
import rolesHandler from '@app/pages/api/keycloak/roles';
import serviceAccountsHandler from '@app/pages/api/teams/[teamId]/service-accounts';
import credentialsHandler from '@app/pages/api/teams/[teamId]/service-accounts/[saId]/credentials';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return { ...original, keycloakClient: jest.fn(() => Promise.resolve(true)) };
});

jest.mock('@app/keycloak/installation', () => ({
  generateInstallation: jest.fn(() => Promise.resolve({ credentials: { secret: 's3cret' } })),
  updateClientSecret: jest.fn(() => Promise.resolve()),
}));

jest.mock('@app/keycloak/users', () => ({
  ...jest.requireActual('@app/keycloak/users'),
  findClientRole: jest.fn(() => Promise.resolve(null)),
  createRole: jest.fn(() => Promise.resolve({ roleName: 'new-role' })),
}));

const events = async (requestId: number, action: string) =>
  (await getEventsByRequestId(requestId))
    .map((event: any) => event.get({ plain: true }))
    .filter((event: any) => event.eventCode === action);

describe('inline operations and their audit events', () => {
  let integration: any;

  beforeAll(async () => {
    await cleanUpDatabaseTables();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    integration = (await buildIntegration({ projectName: 'inline audit', submitted: true })).body;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  describe('the daily request limit', () => {
    it('records a refused submission as request-limit-reached, attributed to the user', async () => {
      const count = jest.spyOn(models.request, 'count').mockResolvedValueOnce(5000 as never);
      try {
        const response = await createIntegration(getCreateIntegrationData({ projectName: 'one too many' }));
        expect(response.status).toBe(429);
      } finally {
        count.mockRestore();
      }

      const event = await models.event.findOne({ where: { eventCode: 'request-limit-reached' }, raw: true });
      expect(event).toMatchObject({ outcome: 'success', actorId: TEAM_ADMIN_IDIR_USERID_01, targetType: 'app-user' });
      expect(event.details).toMatchObject({ count: 5000 });
    });
  });

  describe('integration secrets', () => {
    it('records viewing the installation as one credentials-view success', async () => {
      const response = await testClient(installationHandler)
        .post(`${API_BASE_PATH}/installation`)
        .send({ requestId: integration.id, environment: 'dev' });

      expect(response.status).toBe(200);
      const viewed = await events(integration.id, 'credentials-view');
      expect(viewed.map((event: any) => [event.outcome, event.environment, event.targetType, event.targetId])).toEqual([
        ['success', 'dev', 'integration', integration.clientId],
      ]);
      expect(viewed[0].actorId).toBe(TEAM_ADMIN_IDIR_USERID_01);
    });

    it('does not hand out credentials when the view cannot be recorded', async () => {
      const create = models.event.create.bind(models.event);
      const spy = jest
        .spyOn(models.event, 'create')
        .mockImplementation((values: any, options: any) =>
          values.eventCode === 'credentials-view'
            ? Promise.reject(new Error('audit store down'))
            : create(values, options),
        );
      try {
        const response = await testClient(installationHandler)
          .post(`${API_BASE_PATH}/installation`)
          .send({ requestId: integration.id, environment: 'test' });
        expect(response.status).not.toBe(200);
        expect(JSON.stringify(response.body)).not.toContain('s3cret');
      } finally {
        spy.mockRestore();
      }
    });

    it('records rotating the secret as a secret-rotate operation', async () => {
      const response = await testClient(installationHandler)
        .put(`${API_BASE_PATH}/installation`)
        .send({ requestId: integration.id, environment: 'prod' });

      expect(response.status).toBe(200);
      const rotated = await events(integration.id, 'secret-rotate');
      expect(rotated.map((event: any) => [event.outcome, event.environment])).toEqual([
        ['requested', 'prod'],
        ['success', 'prod'],
      ]);
      expect(rotated[0].operationId).toBe(rotated[1].operationId);
    });

    it('records a failed rotation with the error', async () => {
      (updateClientSecret as jest.Mock).mockRejectedValueOnce(new Error('keycloak down'));

      const response = await testClient(installationHandler)
        .put(`${API_BASE_PATH}/installation`)
        .send({ requestId: integration.id, environment: 'test' });

      expect(response.status).not.toBe(200);
      const failed = (await events(integration.id, 'secret-rotate')).filter(
        (event: any) => event.outcome === 'failure',
      );
      expect(failed).toHaveLength(1);
      expect(failed[0].details).toEqual({ error: { message: 'keycloak down' } });
    });
  });

  describe('team api account secrets', () => {
    it('records viewing the credentials against the team and the account', async () => {
      const team = await createTeam({ name: 'inline audit team', members: [] });
      const account = await testClient(serviceAccountsHandler).post(
        `${API_BASE_PATH}/teams/${team.body.id}/service-accounts`,
      );

      const response = await testClient(credentialsHandler).get(
        `${API_BASE_PATH}/teams/${team.body.id}/service-accounts/${account.body.id}/credentials`,
      );

      expect(response.status).toBe(200);
      expect(generateInstallation).toHaveBeenCalled();
      const viewed = await events(account.body.id, 'credentials-view');
      expect(viewed).toHaveLength(1);
      expect(viewed[0]).toMatchObject({
        teamId: team.body.id,
        environment: 'prod',
        targetType: 'service-account',
        targetId: `service-account-${account.body.clientId}`.toLowerCase(),
      });
    });
  });

  describe('roles', () => {
    it('writes the role row only once Keycloak has the role, with the role-create success', async () => {
      (createRole as jest.Mock).mockRejectedValueOnce(new Error('keycloak down'));

      const failed = await testClient(rolesHandler)
        .put(`${API_BASE_PATH}/keycloak/roles`)
        .send({ integrationId: integration.id, environment: 'dev', roleName: 'never-created' });
      expect(failed.status).not.toBe(200);
      expect(await models.requestRole.count({ where: { requestId: integration.id, name: 'never-created' } })).toBe(0);

      const created = await testClient(rolesHandler)
        .put(`${API_BASE_PATH}/keycloak/roles`)
        .send({ integrationId: integration.id, environment: 'dev', roleName: 'new-role' });
      expect(created.status).toBe(200);
      expect(await models.requestRole.count({ where: { requestId: integration.id, name: 'new-role' } })).toBe(1);

      const roleEvents = await events(integration.id, 'role-create');
      expect(roleEvents.map((event: any) => [event.targetId, event.outcome])).toEqual([
        ['never-created', 'requested'],
        ['never-created', 'failure'],
        ['new-role', 'requested'],
        ['new-role', 'success'],
      ]);
    });

    it('rejects creating a role that already exists before recording anything', async () => {
      const { findClientRole } = jest.requireMock('@app/keycloak/users');
      (findClientRole as jest.Mock).mockResolvedValueOnce({ name: 'existing' });

      const response = await testClient(rolesHandler)
        .put(`${API_BASE_PATH}/keycloak/roles`)
        .send({ integrationId: integration.id, environment: 'dev', roleName: 'existing' });

      expect(response.status).toBe(409);
      expect(
        (await events(integration.id, 'role-create')).filter((event: any) => event.targetId === 'existing'),
      ).toEqual([]);
    });
  });
});
