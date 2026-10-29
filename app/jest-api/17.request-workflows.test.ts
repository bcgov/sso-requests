import axios from 'axios';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockSendEmail } from './mocks/mail';
import * as IntegrationModule from '@app/keycloak/integration';
import { formDataProd } from './helpers/fixtures';
import {
  getRequest,
  generateRequest,
  getEventsByRequestId,
  getWorkflowForRequest,
  getWorkflowSteps,
  getWorkflowStep,
  getWorkflows,
  getDeadLetters,
} from './helpers/modules/integrations';
import { EMAILS } from '@app/shared/enums';
import { enqueueRequestWorkflow, getIntegrationProgress } from '@app/workflow/request-workflow';
import { drainWorkflows, runWorkflow } from '@app/workflow/orchestrator';
import { supersedeActiveWorkflows } from '@app/workflow/store';
import * as EffectsModule from '@app/workflow/effects';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { userActor, withActor } from '@sso/audit/server';
import { enqueueIntegrationWorkflow } from '@app/controllers/requests';

jest.mock('@app/keycloak/adminClient');

// This suite drives the orchestrator step by step, so workflows are persisted but never auto-started.
process.env.WORKFLOW_EXECUTION_MODE = 'manual';

const MAX_STEP_ATTEMPTS = 5;

// Pin the retry policy: no jitter, no waiting, and a `runAfter` in the past so a retried workflow is
// immediately re-claimable by the next `drainWorkflows()` call.
jest.mock('@app/workflow/backoff', () => ({
  MAX_STEP_ATTEMPTS: 5,
  CLAIM_LEASE_SECONDS: 300,
  IN_PROCESS_RETRY_CEILING_MS: 0,
  STEP_TIMEOUT_MS: 2000,
  backoffDelayMs: () => 0,
  nextRunAfter: () => ({ runAfter: new Date(Date.now() - 1000), delayMs: 0 }),
}));

const enqueue = async (payload: any = formDataProd, options: any = {}) => {
  const request = await generateRequest(payload);
  const result = await enqueueRequestWorkflow({ ...payload, id: request.id }, options);
  return { request, ...result };
};

describe('Integration workflow - happy path', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Persists the workflow and its full step plan before executing anything', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();

    // Nothing has run yet - the workflow is durable from the moment it is accepted.
    expect(kcClientSpy).not.toHaveBeenCalled();

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('PENDING');
    expect(workflow.id).toBe(workflowId);

    const steps = await getWorkflowSteps(workflowId);
    expect(steps.map((step: any) => step.name)).toEqual([
      'PLAN',
      'APPLY_DEV',
      'APPLY_TEST',
      'APPLY_PROD',
      'FINALIZE',
      'NOTIFY',
    ]);
    expect(steps.every((step: any) => step.state === 'PENDING')).toBe(true);

    kcClientSpy.mockRestore();
  });

  it('Applies every environment, completes the workflow, marks the request applied and emails the requester', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const emailResults = createMockSendEmail();

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('COMPLETED');
    expect(workflow.claimedBy).toBeNull();

    const steps = await getWorkflowSteps(workflowId);
    expect(steps.every((step: any) => step.state === 'COMPLETED')).toBe(true);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applied');

    expect(emailResults).toHaveLength(1);
    expect(emailResults[0].code).toBe(EMAILS.CREATE_INTEGRATION_APPLIED);

    // The engine records the plan step and the operation's outcome, under the workflow's correlation id.
    const events = await getEventsByRequestId(request.id);
    expect(events.map((event: any) => [event.eventCode, event.outcome])).toEqual([
      ['request-plan', 'success'],
      ['request-create', 'success'],
    ]);
    expect(
      events.every(
        (event: any) =>
          event.workflowId === workflowId &&
          event.operationId === workflow.correlationId &&
          event.actorType === 'system' &&
          event.actorId === 'workflow-engine',
      ),
    ).toBe(true);
    expect(events[1].details).toEqual({});

    kcClientSpy.mockRestore();
  });

  it('Sends an update email when the integration was previously applied', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const request = await generateRequest(formDataProd);
    // An apply recorded before @sso/audit, as the migration leaves it.
    await models.event.create({
      eventCode: 'request-apply',
      outcome: 'success',
      actorType: 'system',
      requestId: request.id,
    });

    const emailResults = createMockSendEmail();
    const { workflowId } = await enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any);
    await runWorkflow(workflowId);

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.context.isCreate).toBe(false);

    expect(emailResults).toHaveLength(1);
    expect(emailResults[0].code).toBe(EMAILS.UPDATE_INTEGRATION_APPLIED);

    kcClientSpy.mockRestore();
  });

  it('Passes the existing client id through to Keycloak so a renamed client is migrated', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { workflowId } = await enqueue(formDataProd, { existingClientId: 'existing-id' });
    await runWorkflow(workflowId);

    expect(kcClientSpy).toHaveBeenCalledWith('dev', expect.anything(), 'existing-id');

    kcClientSpy.mockRestore();
  });
});

describe('Integration workflow - idempotency and de-duplication', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Returns the in-flight workflow instead of starting a second workflow for the same integration', async () => {
    const { request, workflowId, created } = await enqueue();
    expect(created).toBe(true);

    const duplicate = await enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any);
    expect(duplicate.queued).toBe(true);
    expect(duplicate.workflowId).not.toBe(workflowId);

    // Only one workflow is claimable; the resubmit waits its turn rather than being dropped.
    const workflows = await getWorkflows();
    expect(workflows).toHaveLength(2);
    expect(workflows.filter((workflow: any) => workflow.state === 'PENDING')).toHaveLength(1);
    expect(workflows.filter((workflow: any) => workflow.state === 'QUEUED')).toHaveLength(1);
  });

  it('Re-running a completed workflow is a safe no-op', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { workflowId } = await enqueue();
    await runWorkflow(workflowId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);
    expect(await models.event.count({ where: { workflowId, eventCode: 'request-create', outcome: 'success' } })).toBe(
      1,
    );

    // A redelivered command must not re-apply anything.
    await runWorkflow(workflowId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);
    expect(await models.event.count({ where: { workflowId } })).toBe(2);

    kcClientSpy.mockRestore();
  });

  it('records delete workflow completion separately from the delete request event', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient').mockImplementation(() => Promise.resolve(true));
    const payload = { ...formDataProd, archived: true };
    const request = await generateRequest(payload);
    const { workflowId } = await enqueueRequestWorkflow({ ...payload, id: request.id } as any);

    await runWorkflow(workflowId);

    const event = await models.event.findOne({ where: { workflowId, eventCode: 'request-delete' } });
    expect(event.outcome).toBe('success');

    kcClientSpy.mockRestore();
  });

  it('Resumes from the failed step rather than replaying completed steps', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy
      .mockResolvedValueOnce(true) // dev
      .mockResolvedValueOnce(false) // test fails
      .mockImplementation(() => Promise.resolve(true));

    const { workflowId } = await enqueue();
    await runWorkflow(workflowId);

    expect(await getWorkflowStep(workflowId, 'APPLY_DEV').then((step: any) => step.state)).toBe('COMPLETED');
    expect(await getWorkflowStep(workflowId, 'APPLY_TEST').then((step: any) => step.state)).toBe('FAILED');

    kcClientSpy.mockClear();
    await drainWorkflows();

    // dev is not re-applied; the workflow picks up at test.
    expect(kcClientSpy.mock.calls.map((call) => call[0])).toEqual(['test', 'prod']);

    const workflow = await getWorkflowForRequest((await getWorkflows())[0].requestId);
    expect(workflow.state).toBe('COMPLETED');

    kcClientSpy.mockRestore();
  });

  it('Does not write duplicate audit events when a step is replayed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);
    await runWorkflow(workflowId);

    const events = await getEventsByRequestId(request.id);
    const planEvents = events.filter((event: any) => event.eventCode === 'request-plan');
    expect(planEvents).toHaveLength(1);
    expect(events.filter((event: any) => event.eventCode === 'request-create')).toHaveLength(1);

    kcClientSpy.mockRestore();
  });
});

describe('Request workflow - retries and dead lettering', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Retries a failing step with backoff before giving up', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockResolvedValueOnce(false).mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    let step = await getWorkflowStep(workflowId, 'APPLY_DEV');
    expect(step.state).toBe('FAILED');
    expect(step.attempts).toBe(1);

    await drainWorkflows();

    step = await getWorkflowStep(workflowId, 'APPLY_DEV');
    expect(step.state).toBe('COMPLETED');
    expect(step.attempts).toBe(2);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applied');

    kcClientSpy.mockRestore();
  });

  it('Dead letters the workflow and alerts operations once retries are exhausted', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(false));
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
    process.env.RC_SSO_OPS_WEBHOOK = 'https://example.test/hook';

    const { request, workflowId } = await enqueue();

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await drainWorkflows();

    const step = await getWorkflowStep(workflowId, 'APPLY_DEV');
    expect(step.attempts).toBe(MAX_STEP_ATTEMPTS);

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('FAILED');
    expect(workflow.claimedBy).toBeNull();

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applyFailed');

    const deadLetters = await getDeadLetters();
    expect(deadLetters).toHaveLength(1);
    expect(deadLetters[0].failedStep).toBe('APPLY_DEV');

    expect(axios.post).toHaveBeenCalled();
    const [, alertBody] = (axios.post as jest.Mock).mock.calls[0];
    expect(alertBody.message).toContain('requires manual intervention');

    const events = await getEventsByRequestId(request.id);
    const failure = events.find((event: any) => event.eventCode === 'request-create' && event.outcome === 'failure');
    expect(failure.operationId).toBe(workflow.correlationId);
    expect(failure.details).toMatchObject({ failedStep: 'APPLY_DEV', error: { message: expect.any(String) } });

    kcClientSpy.mockRestore();
  });
});

describe('Integration workflow - no rollback on failure', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Leaves already-applied environments untouched when a later environment fails', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation((environment: string) => Promise.resolve(environment !== 'prod'));

    const { request, workflowId } = await enqueue();

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await drainWorkflows();

    // Nothing is ever torn down.
    expect(kcClientSpy.mock.calls.some((call: any) => call[1]?.archived === true)).toBe(false);
    // dev/test are applied exactly once and never re-applied by the retries of prod.
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'dev')).toHaveLength(1);
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'test')).toHaveLength(1);
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'prod')).toHaveLength(MAX_STEP_ATTEMPTS);

    const steps = await getWorkflowSteps(workflowId);
    const byName = Object.fromEntries(steps.map((step: any) => [step.name, step.state]));
    expect(byName.APPLY_DEV).toBe('COMPLETED');
    expect(byName.APPLY_TEST).toBe('COMPLETED');
    expect(byName.APPLY_PROD).toBe('FAILED');

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('FAILED');
    expect(workflow.currentStep).toBe('APPLY_PROD');

    kcClientSpy.mockRestore();
  });

  it('Resumes from the failed step when the cron tick retries a recovered workflow', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation((environment: string) => Promise.resolve(environment !== 'prod'));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    expect(await getWorkflowStep(workflowId, 'APPLY_PROD').then((step: any) => step.state)).toBe('FAILED');

    // Keycloak recovers before the next tick.
    kcClientSpy.mockClear();
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    await drainWorkflows();

    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['prod']);

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('COMPLETED');
    expect((await getRequest(request.id)).status).toBe('applied');

    kcClientSpy.mockRestore();
  });

  it('Skips the notification step rather than failing an integration that is already applied', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const notifySpy = jest.spyOn(EffectsModule, 'updatePlannedIntegration');
    notifySpy.mockImplementation(() => Promise.reject(new Error('smtp unavailable')));
    process.env.RC_SSO_OPS_WEBHOOK = 'https://example.test/hook';

    const { request, workflowId } = await enqueue();

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await drainWorkflows();

    const steps = await getWorkflowSteps(workflowId);
    const byName = Object.fromEntries(steps.map((step: any) => [step.name, step.state]));
    expect(byName.FINALIZE).toBe('COMPLETED');
    expect(byName.NOTIFY).toBe('SKIPPED');

    const notifyStep = await getWorkflowStep(workflowId, 'NOTIFY');
    expect(notifyStep.attempts).toBe(MAX_STEP_ATTEMPTS);
    expect(notifyStep.lastError).toContain('smtp unavailable');

    // The integration itself succeeded, so the workflow must not be failed or dead lettered.
    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('COMPLETED');
    expect((await getRequest(request.id)).status).toBe('applied');
    expect(await getDeadLetters()).toHaveLength(0);

    const events = await getEventsByRequestId(request.id);
    expect(
      events.filter((event: any) => event.eventCode === 'request-create').map((event: any) => event.outcome),
    ).toEqual(['success']);

    const [, alertBody] = (axios.post as jest.Mock).mock.calls[0];
    expect(alertBody.message).toContain('skipped it');

    notifySpy.mockRestore();
    kcClientSpy.mockRestore();
  });
});

const DELETE_OPERATION = '00000000-0000-4000-8000-000000000001';

describe('Integration workflow - superseding', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Abandons a workflow superseded mid-flight instead of applying the remaining environments', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    // Simulates a delete landing while the dev environment is still being configured.
    kcClientSpy.mockImplementation(async (environment: string, integration: any) => {
      if (environment === 'dev') await supersedeActiveWorkflows(integration.id, { operationId: DELETE_OPERATION });
      return true;
    });

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    // test and prod are never touched, so the delete cannot be undone by this workflow.
    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['dev']);

    const steps = await getWorkflowSteps(workflowId);
    const byName = Object.fromEntries(steps.map((step: any) => [step.name, step.state]));
    expect(byName.APPLY_DEV).toBe('COMPLETED');
    expect(byName.APPLY_TEST).toBe('PENDING');
    expect(byName.FINALIZE).toBe('PENDING');

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('SUPERSEDED');
    expect(workflow.claimedBy).toBeNull();

    // The superseded workflow owns neither the request status nor the dead letter queue.
    expect((await getRequest(request.id)).status).not.toBe('applied');
    expect(await getDeadLetters()).toHaveLength(0);

    // Its operation ends `superseded` by the delete, recorded once, and never also `success`.
    const outcomes = await models.event.findAll({
      where: { operationId: workflow.correlationId, eventCode: 'request-create' },
      raw: true,
    });
    expect(outcomes.map((event: any) => event.outcome)).toEqual(['superseded']);
    expect(outcomes[0].details).toEqual({ supersededByOperationId: DELETE_OPERATION });

    kcClientSpy.mockRestore();
  });

  it('Sweeps every environment when deleting so a client left behind by a superseded update is removed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    // The snapshot only lists dev, but an earlier update may already have created test and prod.
    const { workflowId } = await enqueue({ ...formDataProd, environments: ['dev'], archived: true });

    const steps = await getWorkflowSteps(workflowId);
    expect(steps.map((step: any) => step.name)).toEqual([
      'PLAN',
      'APPLY_DEV',
      'APPLY_TEST',
      'APPLY_PROD',
      'FINALIZE',
      'NOTIFY',
    ]);

    await runWorkflow(workflowId);
    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['dev', 'test', 'prod']);
    expect(kcClientSpy.mock.calls.every((call: any) => call[1]?.archived === true)).toBe(true);

    kcClientSpy.mockRestore();
  });
});

describe('Request workflow - queued resubmissions', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Keeps only the newest queued follow-up when a user resubmits repeatedly', async () => {
    const { request } = await enqueue();

    await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'first edit' } as any);
    await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'second edit' } as any);

    const workflows = await getWorkflows();
    expect(workflows).toHaveLength(2);

    const queued = workflows.find((workflow: any) => workflow.state === 'QUEUED');
    expect(queued.payload.projectName).toBe('second edit');
  });

  it('Closes out the overwritten queued submission so its operation is never left hanging', async () => {
    const { request } = await enqueue();
    const first = await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'first edit' } as any);
    const second = await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'second edit' } as any);

    // The queued row is reused under the newer submission's correlation id.
    expect(second.workflowId).toBe(first.workflowId);
    expect(second.correlationId).not.toBe(first.correlationId);

    const superseded = await models.event.findAll({ where: { operationId: first.correlationId }, raw: true });
    expect(superseded.map((event: any) => [event.eventCode, event.outcome, event.actorId])).toEqual([
      ['request-create', 'superseded', 'workflow-engine'],
    ]);
    expect(superseded[0].details).toEqual({
      supersededByWorkflowId: first.workflowId,
      supersededByOperationId: second.correlationId,
    });
  });

  it('Supersedes in-flight work for a delete in the same transaction that enqueues it', async () => {
    const { request, workflowId, correlationId } = await enqueue();
    const deletion = await enqueueRequestWorkflow({ ...formDataProd, id: request.id, archived: true } as any);

    expect((await getWorkflows()).find((workflow: any) => workflow.id === workflowId).state).toBe('SUPERSEDED');
    const outcome = await models.event.findOne({ where: { operationId: correlationId }, raw: true });
    expect(outcome).toMatchObject({ eventCode: 'request-create', outcome: 'superseded' });
    expect(outcome.details).toEqual({
      supersededByWorkflowId: deletion.workflowId,
      supersededByOperationId: deletion.correlationId,
    });
  });

  it('Promotes and applies the queued submission once the in-flight workflow completes', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    const { workflowId: queuedId } = await enqueueRequestWorkflow({
      ...formDataProd,
      id: request.id,
      projectName: 'edited while in flight',
    } as any);

    await runWorkflow(workflowId);

    const promoted = await getWorkflowForRequest(request.id);
    expect(promoted.id).toBe(queuedId);
    expect(promoted.state).toBe('PENDING');

    await drainWorkflows();

    const workflows = await getWorkflows();
    expect(workflows.map((workflow: any) => workflow.state)).toEqual(['COMPLETED', 'COMPLETED']);

    // The edit the user made mid-flight is what actually reached Keycloak.
    expect(kcClientSpy.mock.calls.some((call: any) => call[1]?.projectName === 'edited while in flight')).toBe(true);

    kcClientSpy.mockRestore();
  });

  it('Promotes a queued workflow orphaned by a pod that died before promoting it', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    await enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any);

    // The owning pod wrote its terminal state and then died before handing over.
    await models.requestWorkflow.update({ state: 'COMPLETED' }, { where: { id: workflowId } });

    await drainWorkflows();

    const workflows = await getWorkflows();
    expect(workflows.map((workflow: any) => workflow.state)).toEqual(['COMPLETED', 'COMPLETED']);

    kcClientSpy.mockRestore();
  });

  it('Runs the queued submission even when the workflow ahead of it failed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation((environment: string) => Promise.resolve(environment !== 'prod'));

    const { request, workflowId } = await enqueue();
    await enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any);

    // Drive only the workflow ahead so the promoted one is not drained into the same outage.
    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await runWorkflow(workflowId);

    const failed = (await getWorkflows()).find((workflow: any) => workflow.id === workflowId);
    expect(failed.state).toBe('FAILED');

    const promoted = (await getWorkflows()).find((workflow: any) => workflow.id !== workflowId);
    expect(promoted.state).toBe('PENDING');

    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    await drainWorkflows();

    const queued = (await getWorkflows()).find((workflow: any) => workflow.id !== workflowId);
    expect(queued.state).toBe('COMPLETED');

    kcClientSpy.mockRestore();
  });

  it('Adopts the winner when two submissions race the very first insert', async () => {
    const request = await generateRequest(formDataProd);
    const payload = { ...formDataProd, id: request.id } as any;

    // Row locks cannot block an insert of a row that does not exist yet, so this really does race.
    const results = await Promise.all([enqueueRequestWorkflow(payload), enqueueRequestWorkflow(payload)]);

    expect(results.every((result) => Boolean(result.workflowId))).toBe(true);

    const workflows = await getWorkflows();
    expect(workflows.filter((workflow: any) => workflow.state === 'PENDING')).toHaveLength(1);
    expect(workflows.length).toBeLessThanOrEqual(2);
  });

  it('Lets the losing submission adopt the winner inside its own transaction and records it superseded', async () => {
    const request = await generateRequest(formDataProd);
    const submit = () =>
      withActor(userActor('RACER', 'Racer'), () =>
        sequelize.transaction((transaction) =>
          enqueueIntegrationWorkflow({ ...formDataProd, id: request.id }, {}, transaction),
        ),
      );

    // The loser's insert waits on the winner's uncommitted row, then fails on the unique index inside a
    // savepoint, which leaves its transaction usable for adopting the winner and writing its own events.
    const results = await Promise.all([submit(), submit()]);
    const loser = results.find((result) => !result!.created)!;
    const winner = results.find((result) => result!.created)!;
    expect(loser.workflowId).toBe(winner.workflowId);

    expect((await getWorkflows()).map((workflow: any) => workflow.state)).toEqual(['PENDING']);

    const loserEvents = await models.event.findAll({
      where: { operationId: loser.operationId },
      order: [['id', 'ASC']],
      raw: true,
    });
    expect(loserEvents.map((event: any) => [event.eventCode, event.outcome, event.actorType])).toEqual([
      ['request-create', 'requested', 'user'],
      ['request-create', 'superseded', 'system'],
    ]);
    expect(loserEvents[1].details).toEqual({
      supersededByWorkflowId: winner.workflowId,
      supersededByOperationId: winner.operationId,
    });
  });
});

describe('Request workflow - step timeouts', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Times out a step that never returns instead of wedging the workflow in RUNNING', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => new Promise(() => undefined));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    const step = await getWorkflowStep(workflowId, 'APPLY_DEV');
    expect(step.state).toBe('FAILED');
    expect(step.lastError).toContain('timed out');
    expect(step.attempts).toBe(1);

    // The lease is dropped, so the recovery tick can retry rather than waiting on a dead heartbeat.
    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.claimedBy).toBeNull();
    expect(workflow.state).toBe('RUNNING');

    kcClientSpy.mockRestore();
  });
});

describe('Request workflow - progress projection', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Reports an active workflow while it runs and an inactive one once complete', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();

    let progress = await getIntegrationProgress(request.id);
    expect(progress?.active).toBe(true);
    expect(progress?.state).toBe('PENDING');
    expect(progress?.steps.length).toBe(6);
    expect(progress?.steps[0].label).toBe('Request received and validated');

    await runWorkflow(workflowId);

    progress = await getIntegrationProgress(request.id);
    expect(progress?.active).toBe(false);
    expect(progress?.state).toBe('COMPLETED');
    expect(progress?.failedStep).toBeNull();

    kcClientSpy.mockRestore();
  });

  it('Returns null for an integration that has never been submitted', async () => {
    const request = await generateRequest(formDataProd);
    expect(await getIntegrationProgress(request.id)).toBeNull();
  });
});
