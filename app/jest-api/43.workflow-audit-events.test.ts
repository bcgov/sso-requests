import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
} from './helpers/fixtures';
import { buildIntegration } from './helpers/modules/common';
import {
  deleteIntegration,
  getEventsByRequestId,
  getWorkflows,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import { createTeam } from './helpers/modules/teams';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { keycloakClient } from '@app/keycloak/integration';
import serviceAccountsHandler from '@app/pages/api/teams/[teamId]/service-accounts';
import serviceAccountHandler from '@app/pages/api/teams/[teamId]/service-accounts/[saId]';
import serviceAccountRestoreHandler from '@app/pages/api/teams/[teamId]/service-accounts/[saId]/restore';
import resubmitHandler from '@app/pages/api/requests/[id]/resubmit';
import { enqueueRequestWorkflow } from '@app/workflow/request-workflow';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return { ...original, keycloakClient: jest.fn(() => Promise.resolve(true)) };
});

jest.mock('@app/utils/graph-api', () => ({
  searchIdirEmail: jest.fn(() => Promise.resolve([])),
  validateIdirEmail: jest.fn(() => Promise.resolve({ given_name: 'John', family_name: 'Doe' })),
}));

jest.mock('@app/keycloak/client', () => ({
  disableIntegration: jest.fn(() => Promise.resolve()),
  fetchClient: jest.fn(() => Promise.resolve()),
}));

// Each workflow-backed operation: requested by the person who asked, answered by the engine, one operation id.
const operations = async (requestId: number, action: string) => {
  const events = (await getEventsByRequestId(requestId)).map((event: any) => event.get({ plain: true }));
  return events.filter((event: any) => event.eventCode === action);
};

const expectAnswered = (events: any[], terminal: string = 'success') => {
  expect(events.map((event) => [event.outcome, event.actorType])).toEqual([
    ['requested', 'user'],
    [terminal, 'system'],
  ]);
  expect(events[0].actorId).toBe(TEAM_ADMIN_IDIR_USERID_01);
  expect(events[1].actorId).toBe('workflow-engine');
  expect(events[1].operationId).toBe(events[0].operationId);
  expect(events[1].workflowId).toBe(events[0].workflowId);
  expect(events[0].workflowId).toBeTruthy();
};

describe('workflow-backed operations and their audit events', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(true));
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  describe('integrations', () => {
    it('records a first submission as request-create, with the workflow correlation id as its operation id', async () => {
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });

      const created = await operations(integration.body.id, 'request-create');
      expectAnswered(created);

      const [workflow] = await getWorkflows();
      expect(created[0].operationId).toBe(workflow.correlationId);
      expect(created[0].requestId).toBe(integration.body.id);
    });

    it('records a later submission as request-update, carrying the changes on the requested row', async () => {
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });

      const response = await updateIntegration({ ...integration.body, projectName: 'audited again' }, true);
      expect(response.status).toBe(200);

      const updated = await operations(integration.body.id, 'request-update');
      expectAnswered(updated);
      expect(updated[0].details.changes).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: ['projectName'], rhs: 'audited again' })]),
      );
      expect(updated[1].details).toEqual({});
    });

    it('leaves nothing behind when the requested event cannot be written', async () => {
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });
      const workflowsBefore = (await getWorkflows()).length;

      const create = models.event.create.bind(models.event);
      const spy = jest
        .spyOn(models.event, 'create')
        .mockImplementation((values: any, options: any) =>
          values.outcome === 'requested' ? Promise.reject(new Error('audit store down')) : create(values, options),
        );
      try {
        const response = await updateIntegration({ ...integration.body, projectName: 'never saved' }, true);
        expect(response.status).toBe(422);
      } finally {
        spy.mockRestore();
      }

      // The integration row, its workflow and its event commit together, so none of them did.
      expect((await models.request.findByPk(integration.body.id)).projectName).toBe('audited');
      expect(await getWorkflows()).toHaveLength(workflowsBefore);
      expect(await operations(integration.body.id, 'request-update')).toEqual([]);
      expect(keycloakClient).toHaveBeenCalledTimes(2);
    });

    it('records a resubmit as an update operation', async () => {
      // Resubmit retries a workflow that ended badly: this one fails applying, past planning.
      (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });
      expectAnswered(await operations(integration.body.id, 'request-create'), 'failure');
      (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(true));

      const response = await testClient(resubmitHandler).get(
        `${API_BASE_PATH}/requests/${integration.body.id}/resubmit`,
      );
      expect(response.status).toBe(200);

      expectAnswered(await operations(integration.body.id, 'request-update'));
    });

    it('records deleting an applied integration as a request-delete operation the engine completes', async () => {
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });

      expect((await deleteIntegration(integration.body.id)).status).toBe(200);

      expectAnswered(await operations(integration.body.id, 'request-delete'));
    });

    it('records deleting a draft as a single request-delete success, with no workflow', async () => {
      const integration = await buildIntegration({ projectName: 'draft' });

      expect((await deleteIntegration(integration.body.id)).status).toBe(200);

      const deleted = await operations(integration.body.id, 'request-delete');
      expect(deleted.map((event: any) => [event.outcome, event.actorId, event.workflowId])).toEqual([
        ['success', TEAM_ADMIN_IDIR_USERID_01, null],
      ]);
      expect(await getWorkflows()).toHaveLength(0);
    });

    it('records a restore, requested by the admin who restored it', async () => {
      const integration = await buildIntegration({ projectName: 'audited', submitted: true });
      await deleteIntegration(integration.body.id);

      createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);
      expect((await restoreIntegration(integration.body.id, TEAM_ADMIN_IDIR_EMAIL_01)).status).toBe(200);

      const restored = await operations(integration.body.id, 'request-restore');
      expect(restored.map((event: any) => [event.outcome, event.actorId])).toEqual([
        ['requested', SSO_ADMIN_USERID_01],
        ['success', 'workflow-engine'],
      ]);
    });
  });

  describe('team api accounts', () => {
    const createAccount = (teamId: number) =>
      testClient(serviceAccountsHandler).post(`${API_BASE_PATH}/teams/${teamId}/service-accounts`);

    it('records create, delete and restore against the team', async () => {
      const team = await createTeam({ name: 'audited team', members: [] });
      const teamId = team.body.id;

      const created = await createAccount(teamId);
      expect(created.status).toBe(200);
      const accountId = created.body.id;
      expectAnswered(await operations(accountId, 'api-account-create'));
      expect((await operations(accountId, 'api-account-create')).every((event: any) => event.teamId === teamId)).toBe(
        true,
      );

      const deleted = await testClient(serviceAccountHandler).delete(
        `${API_BASE_PATH}/teams/${teamId}/service-accounts/${accountId}`,
      );
      expect(deleted.status).toBe(200);
      expectAnswered(await operations(accountId, 'api-account-delete'));

      // Restoring an api account is an sso-admin action.
      createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01, ['sso-admin']);
      const restored = await testClient(serviceAccountRestoreHandler).get(
        `${API_BASE_PATH}/teams/${teamId}/service-accounts/${accountId}/restore`,
      );
      expect(restored.status).toBe(200);
      expectAnswered(await operations(accountId, 'api-account-restore'));
    });

    it('fails with the operation id when the workflow fails, leaving the engine failure as the only outcome', async () => {
      (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
      const team = await createTeam({ name: 'audited team', members: [] });

      const response = await createAccount(team.body.id);
      expect(response.status).toBe(422);

      const account = await models.request.findOne({ where: { teamId: team.body.id, apiServiceAccount: true } });
      expect(account.status).toBe('applyFailed');

      const events = await operations(account.id, 'api-account-create');
      expectAnswered(events, 'failure');
      expect(response.body.message).toContain(events[0].operationId);
      expect(events[1].details).toMatchObject({ failedStep: 'APPLY_PROD' });
    });

    it('records any later apply on an account as api-account-create, though the engine runs it as an update', async () => {
      (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
      const team = await createTeam({ name: 'audited team', members: [] });
      await createAccount(team.body.id);
      const account = await models.request.findOne({ where: { teamId: team.body.id, apiServiceAccount: true } });

      // No route re-applies an api account today (integration access excludes them), so drive the engine directly.
      const retry = await enqueueRequestWorkflow({ ...account.get({ plain: true }), status: 'submitted' });

      expect(retry.auditAction).toBe('api-account-create');
      const workflows = await getWorkflows();
      expect(workflows.map((workflow: any) => workflow.action)).toEqual(['create', 'update']);
    });

    it('records deleting an account that never reached Keycloak as a single success', async () => {
      (keycloakClient as jest.Mock).mockImplementation(() => Promise.resolve(false));
      const team = await createTeam({ name: 'audited team', members: [] });
      await createAccount(team.body.id);
      // Drop its apply outcome, so it reads as an account whose workflow never applied anything.
      const account = await models.request.findOne({ where: { teamId: team.body.id, apiServiceAccount: true } });
      await models.event.destroy({ where: { requestId: account.id } });

      const deleted = await testClient(serviceAccountHandler).delete(
        `${API_BASE_PATH}/teams/${team.body.id}/service-accounts/${account.id}`,
      );
      expect(deleted.status).toBe(200);

      const events = await operations(account.id, 'api-account-delete');
      expect(events.map((event: any) => [event.outcome, event.teamId, event.workflowId])).toEqual([
        ['success', team.body.id, null],
      ]);
    });
  });
});
