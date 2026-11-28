import { buildIntegration } from './helpers/modules/common';
import {
  deleteIntegration,
  getEventsByRequestId,
  getRequest,
  getWorkflowForRequest,
  restoreIntegration,
  updateIntegration,
} from './helpers/modules/integrations';
import {
  SSO_ADMIN_EMAIL_01,
  SSO_ADMIN_USERID_01,
  TEAM_ADMIN_IDIR_EMAIL_01,
  TEAM_ADMIN_IDIR_USERID_01,
} from './helpers/fixtures';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { runWorkflow } from '@app/workflow/orchestrator';
import { INTEGRATION_BUSY_MESSAGE } from '@app/helpers/transitions';
import { testClient } from './helpers/test-client';
import { API_BASE_PATH } from './helpers/constants';
import { createTeam } from './helpers/modules/teams';
import { enqueueRequestWorkflow } from '@app/workflow/request-workflow';
import { getWorkflow } from '@app/workflow/store';
import { buildIntegrationWorkflowSteps } from '@app/workflow/steps/integration';
import serviceAccountsHandler from '@app/pages/api/teams/[teamId]/service-accounts';
import serviceAccountHandler from '@app/pages/api/teams/[teamId]/service-accounts/[saId]';
import stopWorkflowHandler from '@app/pages/api/requests/[id]/stop-workflow';
import resubmitHandler from '@app/pages/api/requests/[id]/resubmit';

jest.mock('@app/keycloak/adminClient');

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

jest.mock('@app/keycloak/client', () => {
  return {
    disableIntegration: jest.fn(() => Promise.resolve()),
    fetchClient: jest.fn(() => Promise.resolve()),
  };
});

jest.mock('@app/utils/graph-api', () => {
  return {
    searchIdirEmail: jest.fn(() => Promise.resolve([])),
    validateIdirEmail: jest.fn(() => Promise.resolve({ given_name: 'John', family_name: 'Doe' })),
  };
});

// Submissions are persisted but not run, so a test can hold a workflow in flight while it submits again.
process.env.WORKFLOW_EXECUTION_MODE = 'manual';

const asTeamAdmin = () => createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
const asSsoAdmin = () => createMockAuth(SSO_ADMIN_USERID_01, SSO_ADMIN_EMAIL_01, ['sso-admin']);

const workflowCount = (requestId: number) => models.requestWorkflow.count({ where: { requestId } });

/** A submitted integration whose workflow is persisted and still PENDING. */
const submitIntegration = async (projectName: string) => {
  asTeamAdmin();
  const res = await buildIntegration({ projectName, submitted: true });
  expect(res.status).toEqual(200);
  const workflow = await getWorkflowForRequest(res.body.id);
  expect(workflow.state).toBe('PENDING');
  return { integration: res.body, workflow };
};

describe('One update or delete per integration at a time', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('refuses a restore while the delete it would undo is still in flight', async () => {
    const { integration, workflow } = await submitIntegration(`restore busy ${Date.now()}`);
    expect(await runWorkflow(workflow.id)).toBe('COMPLETED');

    asTeamAdmin();
    expect((await deleteIntegration(integration.id)).status).toBe(200);
    const deletion = await getWorkflowForRequest(integration.id);
    expect(deletion.type).toBe('INTEGRATION_DELETE');
    expect(deletion.state).toBe('PENDING');

    // Restore has no in-flight status guard of its own; the workflow store is what refuses it.
    asSsoAdmin();
    const res = await restoreIntegration(integration.id, TEAM_ADMIN_IDIR_EMAIL_01);
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(INTEGRATION_BUSY_MESSAGE);

    expect((await getRequest(integration.id)).archived).toBe(true);
    expect(await workflowCount(integration.id)).toBe(2);
    const restoreEvents = (await getEventsByRequestId(integration.id)).filter(
      (event: any) => event.eventCode === 'request-restore',
    );
    expect(restoreEvents).toHaveLength(0);

    expect(await runWorkflow(deletion.id)).toBe('COMPLETED');
  });

  it('refuses a submission once the integration reads as applied but its workflow has not yet completed', async () => {
    const { integration, workflow } = await submitIntegration(`finalize window ${Date.now()}`);
    // FINALIZE has written `applied`; the engine has not yet marked the workflow COMPLETED.
    await models.request.update({ status: 'applied' }, { where: { id: integration.id } });
    await models.requestWorkflow.update({ state: 'RUNNING' }, { where: { id: workflow.id } });

    asTeamAdmin();
    const res = await updateIntegration({ ...integration, projectName: 'edit in the finalize window' }, true);
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(INTEGRATION_BUSY_MESSAGE);

    const stored = await getRequest(integration.id);
    expect(stored.projectName).toBe(integration.projectName);
    expect(stored.status).toBe('applied');
    expect(await workflowCount(integration.id)).toBe(1);

    // Let the engine finish, so the accepted submission's operation gets the outcome it is owed.
    expect(await runWorkflow(workflow.id)).toBe('COMPLETED');
  });

  it('refuses to delete an API account while a workflow for it is still running', async () => {
    asTeamAdmin();
    const team = await createTeam({ name: `busy api account ${Date.now()}`, members: [] });
    const created = await testClient(serviceAccountsHandler).post(
      `${API_BASE_PATH}/teams/${team.body.id}/service-accounts`,
    );
    expect(created.status).toBe(200);
    const accountId = created.body.id;

    // An account whose create is still retrying: no apply outcome yet, and a workflow in flight. Deleting it here
    // used to archive the row while that create went on to make its Keycloak client.
    await models.event.destroy({ where: { requestId: accountId } });
    const account = await models.request.findByPk(accountId);
    const retrying = await enqueueRequestWorkflow({ ...account.get({ plain: true }), status: 'submitted' });

    const res = await testClient(serviceAccountHandler).delete(
      `${API_BASE_PATH}/teams/${team.body.id}/service-accounts/${accountId}`,
    );
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(INTEGRATION_BUSY_MESSAGE);
    expect((await models.request.findByPk(accountId)).archived).toBe(false);
    expect(await workflowCount(accountId)).toBe(2);

    expect(await runWorkflow(retrying.workflowId)).toBe('COMPLETED');
  });
});

describe('Stopping a workflow that will not finish on its own', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  const stop = (id: number) => testClient(stopWorkflowHandler).post(`${API_BASE_PATH}/requests/${id}/stop-workflow`);

  /** What a workflow looks like while it keeps retrying APPLY_DEV through an outage. */
  const retryingAtApplyDev = async (projectName: string) => {
    const { integration, workflow } = await submitIntegration(projectName);
    await models.request.update({ status: 'planned' }, { where: { id: integration.id } });
    await models.requestWorkflow.update(
      { state: 'RUNNING', currentStep: 'APPLY_DEV', lastError: 'Request failed with status 503' },
      { where: { id: workflow.id } },
    );
    await models.requestWorkflowStep.update(
      { state: 'COMPLETED', attempts: 1 },
      { where: { requestWorkflowId: workflow.id, name: 'PLAN' } },
    );
    await models.requestWorkflowStep.update(
      { state: 'FAILED', attempts: 9, lastError: 'Request failed with status 503' },
      { where: { requestWorkflowId: workflow.id, name: 'APPLY_DEV' } },
    );
    return { integration, workflow };
  };

  it('ends it as failed, records who stopped it, and lets the owner resubmit', async () => {
    const { integration, workflow } = await retryingAtApplyDev(`stop retrying ${Date.now()}`);

    asSsoAdmin();
    const res = await stop(integration.id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ requestWorkflowId: workflow.id, state: 'FAILED', active: false });

    const stopped = await getWorkflowForRequest(integration.id);
    expect(stopped.state).toBe('FAILED');
    expect(stopped.lastError).toContain('stopped by an administrator');
    expect((await getRequest(integration.id)).status).toBe('applyFailed');
    // A worker that was mid-attempt can no longer claim it.
    expect(await runWorkflow(workflow.id)).toBeNull();

    const events = (await getEventsByRequestId(integration.id)).map((event: any) => event.get({ plain: true }));
    const statusChange = events.find((event: any) => event.eventCode === 'request-status-update');
    expect(statusChange).toMatchObject({ outcome: 'success', details: { before: 'planned', after: 'applyFailed' } });
    expect(statusChange.actorId).not.toBe('workflow-engine');
    const outcomes = events
      .filter((event: any) => event.eventCode === 'request-create')
      .map((event: any) => event.outcome);
    expect(outcomes).toEqual(['requested', 'failure']);
    const [deadLetter] = await models.requestWorkflowFailure.findAll({
      where: { requestId: integration.id },
      raw: true,
    });
    expect(deadLetter).toMatchObject({ failedStep: 'APPLY_DEV' });
    expect(deadLetter.reason).toContain('stopped by an administrator');

    asTeamAdmin();
    const resubmitted = await testClient(resubmitHandler).get(`${API_BASE_PATH}/requests/${integration.id}/resubmit`);
    expect(resubmitted.status).toBe(200);
    const retry = await getWorkflowForRequest(integration.id);
    expect(retry.id).not.toBe(workflow.id);
    expect(await runWorkflow(retry.id)).toBe('COMPLETED');
  });

  it('leaves a stopped workflow failed even if its FINALIZE was already running', async () => {
    const { integration, workflow } = await submitIntegration(`stop before finalize ${Date.now()}`);

    asSsoAdmin();
    expect((await stop(integration.id)).status).toBe(200);
    // Never started, so it failed in planning.
    expect((await getRequest(integration.id)).status).toBe('planFailed');

    const finalize = buildIntegrationWorkflowSteps((await getWorkflow(workflow.id))!).find(
      (step) => step.name === 'FINALIZE',
    )!;
    await expect(finalize.execute({} as any)).resolves.toEqual({ finalized: false });

    expect((await getRequest(integration.id)).status).toBe('planFailed');
    const successes = (await getEventsByRequestId(integration.id)).filter(
      (event: any) => event.eventCode === 'request-create' && event.outcome === 'success',
    );
    expect(successes).toHaveLength(0);
  });

  it('refuses to stop a workflow that has already finished applying', async () => {
    const { integration, workflow } = await submitIntegration(`stop after finalize ${Date.now()}`);
    expect(await runWorkflow(workflow.id)).toBe('COMPLETED');

    asSsoAdmin();
    const nothingRunning = await stop(integration.id);
    expect(nothingRunning.status).toBe(409);
    expect(nothingRunning.body.message).toBe('This integration has no workflow in progress.');

    // FINALIZE has recorded success; the engine has not yet marked the workflow COMPLETED.
    await models.requestWorkflow.update({ state: 'RUNNING' }, { where: { id: workflow.id } });
    const finishing = await stop(integration.id);
    expect(finishing.status).toBe(409);
    expect(finishing.body.message).toBe('This integration has finished applying and completes on its own.');
    expect((await getRequest(integration.id)).status).toBe('applied');

    expect(await runWorkflow(workflow.id)).toBe('COMPLETED');
  });

  it('lets only an administrator stop a workflow', async () => {
    const { integration, workflow } = await submitIntegration(`stop not allowed ${Date.now()}`);

    asTeamAdmin();
    const res = await stop(integration.id);
    expect(res.status).toBe(403);
    expect((await getWorkflowForRequest(integration.id)).state).toBe('PENDING');

    expect(await runWorkflow(workflow.id)).toBe('COMPLETED');
  });
});
