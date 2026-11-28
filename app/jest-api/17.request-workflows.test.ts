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
import {
  enqueueRequestWorkflow,
  executeEnqueuedWorkflow,
  getIntegrationProgress,
} from '@app/workflow/request-workflow';
import { drainWorkflows, resumeTakingWork, runWorkflow, stopTakingWork } from '@app/workflow/orchestrator';
import { IntegrationBusyError, isPermanentError, PermanentStepError, TransientStepError } from '@app/workflow/types';
import { repairStuckRequestStatuses } from '@app/workflow/store';
import * as EffectsModule from '@app/workflow/effects';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { userActor, withActor } from '@sso/audit/server';
import { assertWorkflowCompleted, enqueueIntegrationWorkflow } from '@app/controllers/requests';
import * as SdxModule from '@app/controllers/sdx-services';

jest.mock('@app/keycloak/adminClient');

// This suite drives the orchestrator step by step, so workflows are persisted but never auto-started.
process.env.WORKFLOW_EXECUTION_MODE = 'manual';

const MAX_STEP_ATTEMPTS = 5;

// Most of this suite pins a hard cap on required steps so it can drive a workflow to FAILED; the
// unlimited-retry tests lift it to 0, the production default.
let mockRequiredStepAttemptLimit = MAX_STEP_ATTEMPTS;

// Where a retried workflow's next run lands. In the past by default, so the next `runWorkflow()` claims it; a
// test of waiting callers moves it into the future, as the 10-minute slow retries do.
let mockRetryDelayMs = -1000;

// Pin the retry policy: no jitter, no waiting, and a `runAfter` in the past so a retried workflow is
// immediately re-claimable by the next `drainWorkflows()` call.
jest.mock('@app/workflow/backoff', () => ({
  MAX_STEP_ATTEMPTS: 5,
  get REQUIRED_STEP_ATTEMPT_LIMIT() {
    return mockRequiredStepAttemptLimit;
  },
  CLAIM_LEASE_SECONDS: 300,
  SLOW_RETRY_INTERVAL_MS: 600_000,
  IN_PROCESS_RETRY_CEILING_MS: 0,
  STEP_TIMEOUT_MS: 2000,
  backoffDelayMs: () => 0,
  nextRunAfter: () => ({ runAfter: new Date(Date.now() + mockRetryDelayMs), delayMs: 0 }),
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
      'NOTIFY',
      'FINALIZE',
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

  it('Refuses a second workflow while one is active for the same integration', async () => {
    const { request, workflowId } = await enqueue();

    await expect(enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any)).rejects.toBeInstanceOf(
      IntegrationBusyError,
    );

    const workflows = await getWorkflows();
    expect(workflows.map((workflow: any) => [workflow.id, workflow.state])).toEqual([[workflowId, 'PENDING']]);
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

  it('persists SDX submission and retries it without repeating completed Keycloak steps', async () => {
    const kc = jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    const sdx = jest.spyOn(SdxModule, 'submitSdxRequest').mockRejectedValueOnce(new Error('SDX unavailable'));
    sdx.mockResolvedValueOnce({ success: true, message: 'submitted', data: { requestId: 1, resourceServers: [] } });
    const request = await generateRequest(formDataProd);
    const sdxContext = {
      requesterId: 42,
      request: {
        id: request.id,
        clientId: 'client',
      },
      revokeAll: false,
      resourceServers: [
        {
          id: 'resource-server',
          environment: 'test',
          services: [{ name: 'service', version: 'v1', scopes: ['read'] }],
        },
      ],
    };
    const { workflowId } = await enqueueRequestWorkflow({ ...formDataProd, id: request.id }, { sdx: sdxContext });

    expect((await getWorkflowForRequest(request.id)).context.sdx).toEqual(sdxContext);
    expect(sdx).not.toHaveBeenCalled();
    await runWorkflow(workflowId);
    expect((await getWorkflowStep(workflowId, 'SDX_SUBMIT')).state).toBe('FAILED');
    expect(kc).toHaveBeenCalledTimes(3);

    await drainWorkflows();
    const step = await getWorkflowStep(workflowId, 'SDX_SUBMIT');
    expect(step.state).toBe('COMPLETED');
    expect(step.attempts).toBe(2);
    expect(sdx).toHaveBeenCalledWith(
      42,
      sdxContext.request,
      expect.objectContaining({ revokeAll: false, resourceServers: sdxContext.resourceServers }),
    );
    expect(kc).toHaveBeenCalledTimes(3);
    expect((await getWorkflowForRequest(request.id)).state).toBe('COMPLETED');
    kc.mockRestore();
    sdx.mockRestore();
  });

  it('retries SDX revocation after deleting Keycloak clients without repeating their deletion', async () => {
    const kc = jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    const sdx = jest.spyOn(SdxModule, 'submitSdxRequest').mockRejectedValueOnce(new Error('SDX unavailable'));
    sdx.mockResolvedValueOnce({ success: true, message: 'revoked', data: { requestId: 1, resourceServers: [] } });
    const request = await generateRequest(formDataProd);
    const sdxContext = {
      requesterId: 42,
      request: { id: request.id, clientId: 'client' },
      revokeAll: true,
      resourceServers: [],
    };
    const { workflowId } = await enqueueRequestWorkflow(
      { ...formDataProd, id: request.id, archived: true },
      { sdx: sdxContext },
    );

    await runWorkflow(workflowId);
    expect((await getWorkflowStep(workflowId, 'SDX_SUBMIT')).state).toBe('FAILED');
    expect(kc.mock.calls.map(([environment]) => environment)).toEqual(['dev', 'test', 'prod']);
    expect(kc.mock.invocationCallOrder[2]).toBeLessThan(sdx.mock.invocationCallOrder[0]);

    await drainWorkflows();
    expect((await getWorkflowStep(workflowId, 'SDX_SUBMIT')).attempts).toBe(2);
    expect((await getWorkflowForRequest(request.id)).state).toBe('COMPLETED');
    expect(kc).toHaveBeenCalledTimes(3);
    expect(sdx).toHaveBeenCalledWith(
      42,
      sdxContext.request,
      expect.objectContaining({ revokeAll: true, resourceServers: [] }),
    );
    kc.mockRestore();
    sdx.mockRestore();
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

  it('Never ends a workflow FAILED while leaving its integration in flight', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(false));
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);

    const { request, workflowId } = await enqueue();

    // The failure status cannot be written, as if the database went away between the two writes.
    const update = models.request.update.bind(models.request);
    const statusWrite = jest
      .spyOn(models.request, 'update')
      .mockImplementation(((values: any, options: any) =>
        values?.status === 'applyFailed'
          ? Promise.reject(new Error('database unavailable'))
          : update(values, options)) as any);

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await runWorkflow(workflowId);

    // Neither half was written: the workflow is still active, so the integration rightly reads as busy.
    let workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('RUNNING');
    expect(workflow.claimedBy).toBeNull();
    expect((await getRequest(request.id)).status).toBe('planned');
    expect(await getDeadLetters()).toHaveLength(0);

    statusWrite.mockRestore();
    await runWorkflow(workflowId);

    workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('FAILED');
    expect((await getRequest(request.id)).status).toBe('applyFailed');
    expect(await getDeadLetters()).toHaveLength(1);

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

  it('Skips the notification step rather than failing an integration whose clients are applied', async () => {
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

describe('Integration workflow - deletes and leftover superseded workflows', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Abandons a workflow superseded before this release instead of applying the remaining environments', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(async (environment: string, integration: any) => {
      if (environment === 'dev') {
        await models.requestWorkflow.update({ state: 'SUPERSEDED' }, { where: { requestId: integration.id } });
      }
      return true;
    });

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['dev']);

    const steps = await getWorkflowSteps(workflowId);
    const byName = Object.fromEntries(steps.map((step: any) => [step.name, step.state]));
    expect(byName.APPLY_DEV).toBe('COMPLETED');
    expect(byName.APPLY_TEST).toBe('PENDING');
    expect(byName.FINALIZE).toBe('PENDING');

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('SUPERSEDED');
    expect(workflow.claimedBy).toBeNull();
    expect((await getRequest(request.id)).status).not.toBe('applied');
    expect(await getDeadLetters()).toHaveLength(0);

    const outcomes = await models.event.findAll({
      where: { operationId: workflow.correlationId, eventCode: 'request-create' },
      raw: true,
    });
    expect(outcomes.map((event: any) => event.outcome)).toEqual(['superseded']);

    kcClientSpy.mockRestore();
  });

  it('Sweeps every environment when deleting so a client left behind by an earlier update is removed', async () => {
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
      'NOTIFY',
      'FINALIZE',
    ]);

    await runWorkflow(workflowId);
    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['dev', 'test', 'prod']);
    expect(kcClientSpy.mock.calls.every((call: any) => call[1]?.archived === true)).toBe(true);

    kcClientSpy.mockRestore();
  });
});

describe('Request workflow - one active workflow per integration', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Refuses a delete while an update is in flight and leaves the update to finish', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    await expect(
      enqueueRequestWorkflow({ ...formDataProd, id: request.id, archived: true } as any),
    ).rejects.toBeInstanceOf(IntegrationBusyError);

    await runWorkflow(workflowId);
    expect((await getWorkflows()).map((workflow: any) => workflow.state)).toEqual(['COMPLETED']);
    expect(kcClientSpy.mock.calls.every((call: any) => !call[1]?.archived)).toBe(true);

    kcClientSpy.mockRestore();
  });

  it('Accepts a new submission once the previous workflow has completed or failed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation((environment: string) => Promise.resolve(environment !== 'prod'));

    const { request, workflowId } = await enqueue();
    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await runWorkflow(workflowId);
    expect((await getWorkflowForRequest(request.id)).state).toBe('FAILED');

    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const retry = await enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any);
    await runWorkflow(retry.workflowId);

    const next = await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'next edit' } as any);
    expect(next.state).toBe('PENDING');
    expect((await getWorkflows()).map((workflow: any) => workflow.state).sort()).toEqual([
      'COMPLETED',
      'FAILED',
      'PENDING',
    ]);

    kcClientSpy.mockRestore();
  });

  it('Lets exactly one of two racing submissions through and rolls the other back entirely', async () => {
    const request = await generateRequest(formDataProd);
    const submit = () =>
      withActor(userActor('RACER', 'Racer'), () =>
        sequelize.transaction((transaction) =>
          enqueueIntegrationWorkflow({ ...formDataProd, id: request.id }, {}, transaction),
        ),
      );

    // Row locks cannot block an insert of a row that does not exist yet, so this really does race.
    const results = await Promise.allSettled([submit(), submit()]);
    const accepted = results.filter((result) => result.status === 'fulfilled');
    const refused = results.filter((result) => result.status === 'rejected') as PromiseRejectedResult[];
    expect(accepted).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0].reason).toBeInstanceOf(IntegrationBusyError);

    expect((await getWorkflows()).map((workflow: any) => workflow.state)).toEqual(['PENDING']);
    const requested = await models.event.findAll({ where: { requestId: request.id, outcome: 'requested' }, raw: true });
    expect(requested).toHaveLength(1);

    // This suite drives the engine by hand; running the winner gives its operation the outcome it is owed.
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient').mockImplementation(() => Promise.resolve(true));
    await runWorkflow((accepted[0] as PromiseFulfilledResult<any>).value.workflowId);
    kcClientSpy.mockRestore();
  });

  it('Accepts submissions for two different integrations at the same time', async () => {
    const { id: _fixtureId, ...unsaved } = formDataProd;
    const first = await generateRequest({ ...unsaved, clientId: 'first-client' });
    const second = await generateRequest({ ...unsaved, clientId: 'second-client' });
    const submit = (id: number) =>
      withActor(userActor('SUBMITTER', 'Submitter'), () =>
        sequelize.transaction((transaction) => enqueueIntegrationWorkflow({ ...formDataProd, id }, {}, transaction)),
      );

    const results = await Promise.allSettled([submit(first.id), submit(second.id)]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'fulfilled']);

    const workflows = await getWorkflows();
    expect(workflows).toHaveLength(2);
    expect(workflows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ requestId: first.id, state: 'PENDING' }),
        expect.objectContaining({ requestId: second.id, state: 'PENDING' }),
      ]),
    );

    // Each one is still refused a second submission of its own while it is in flight.
    await expect(enqueueRequestWorkflow({ ...formDataProd, id: first.id } as any)).rejects.toBeInstanceOf(
      IntegrationBusyError,
    );
    await expect(enqueueRequestWorkflow({ ...formDataProd, id: second.id } as any)).rejects.toBeInstanceOf(
      IntegrationBusyError,
    );

    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient').mockImplementation(() => Promise.resolve(true));
    for (const workflow of workflows) await runWorkflow(workflow.id);
    expect((await getWorkflows()).map((workflow: any) => workflow.state)).toEqual(['COMPLETED', 'COMPLETED']);
    kcClientSpy.mockRestore();
  });

  it('Refuses an update while a delete is in flight and leaves the delete to finish', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue({ ...formDataProd, archived: true });
    await expect(
      enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'edit during delete' } as any),
    ).rejects.toBeInstanceOf(IntegrationBusyError);

    await runWorkflow(workflowId);
    expect((await getWorkflows()).map((workflow: any) => workflow.state)).toEqual(['COMPLETED']);
    expect(kcClientSpy.mock.calls.every((call: any) => call[1]?.archived === true)).toBe(true);
    expect(kcClientSpy.mock.calls.some((call: any) => call[1]?.projectName === 'edit during delete')).toBe(false);

    kcClientSpy.mockRestore();
  });

  // Every controller saves the row and enqueues in one transaction, so a refusal must undo the save too.
  it.each([
    ['an update', {}, {}],
    ['a delete', { archived: true }, {}],
    ['a restore', {}, { restore: true }],
  ])('Rolls back %s refused as busy, with its row change and requested event', async (_label, change, options) => {
    const { request, workflowId } = await enqueue();
    const before = await getRequest(request.id);

    await expect(
      withActor(userActor('SECOND', 'Second'), () =>
        sequelize.transaction(async (transaction) => {
          await models.request.update(
            { projectName: 'refused edit', ...change },
            { where: { id: request.id }, transaction },
          );
          return enqueueIntegrationWorkflow(
            { ...formDataProd, id: request.id, projectName: 'refused edit', ...change },
            options,
            transaction,
          );
        }),
      ),
    ).rejects.toBeInstanceOf(IntegrationBusyError);

    const after = await getRequest(request.id);
    expect(after.projectName).toBe(before.projectName);
    expect(after.archived).toBe(before.archived);
    expect(await models.event.count({ where: { requestId: request.id, outcome: 'requested' } })).toBe(0);
    expect((await getWorkflows()).map((workflow: any) => [workflow.id, workflow.state])).toEqual([
      [workflowId, 'PENDING'],
    ]);
  });

  it('Drains a queued follow-up left over from before submissions were refused', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);
    const leftover = await enqueueRequestWorkflow({ ...formDataProd, id: request.id, projectName: 'leftover' } as any);
    await models.requestWorkflow.update({ state: 'QUEUED' }, { where: { id: leftover.workflowId } });

    // A leftover queued follow-up still counts as active work for the integration.
    await expect(enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any)).rejects.toBeInstanceOf(
      IntegrationBusyError,
    );

    await drainWorkflows();

    const drained = (await getWorkflows()).find((workflow: any) => workflow.id === leftover.workflowId);
    expect(drained.state).toBe('COMPLETED');
    expect(kcClientSpy.mock.calls.some((call: any) => call[1]?.projectName === 'leftover')).toBe(true);

    kcClientSpy.mockRestore();
  });
});

describe('Request workflow - integrations left in flight by an ended workflow', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  /** What a crash between the terminal state and the status write left behind before they were atomic. */
  const strand = async (state: string, currentStep: string | null) => {
    const { request, workflowId } = await enqueue();
    await models.request.update({ status: 'planned' }, { where: { id: request.id } });
    await models.requestWorkflow.update({ state, currentStep, completedAt: new Date() }, { where: { id: workflowId } });
    return request;
  };

  it.each([
    ['FAILED', 'APPLY_DEV', 'applyFailed'],
    ['FAILED', 'PLAN', 'planFailed'],
    ['COMPLETED', null, 'applied'],
  ])('Repairs an integration whose workflow ended %s at %s to %s on the next tick', async (state, step, expected) => {
    const request = await strand(state, step);

    await drainWorkflows();

    expect((await getRequest(request.id)).status).toBe(expected);
  });

  it('Leaves alone a status that was set after the workflow ended', async () => {
    const { request, workflowId } = await enqueue();
    await models.requestWorkflow.update(
      { state: 'FAILED', currentStep: 'APPLY_DEV', completedAt: new Date(Date.now() - 60_000) },
      { where: { id: workflowId } },
    );
    await models.request.update({ status: 'submitted' }, { where: { id: request.id } });

    expect(await repairStuckRequestStatuses()).toEqual([]);
    expect((await getRequest(request.id)).status).toBe('submitted');
  });

  it('Leaves alone an integration whose workflow is still in flight', async () => {
    const { request } = await enqueue();
    await models.request.update({ status: 'planned' }, { where: { id: request.id } });

    expect(await repairStuckRequestStatuses()).toEqual([]);
    expect((await getRequest(request.id)).status).toBe('planned');
  });

  it('Leaves alone an integration that was never submitted', async () => {
    const request = await generateRequest({ ...formDataProd, status: 'submitted' });

    expect(await repairStuckRequestStatuses()).toEqual([]);
    expect((await getRequest(request.id)).status).toBe('submitted');
  });
});

describe('Request workflow - retrying until Keycloak or SDX recovers', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
    process.env.RC_SSO_OPS_WEBHOOK = 'https://example.test/hook';
    mockRequiredStepAttemptLimit = 0;
  });

  afterEach(() => {
    mockRequiredStepAttemptLimit = MAX_STEP_ATTEMPTS;
    mockRetryDelayMs = -1000;
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  const OUTAGE_ATTEMPTS = MAX_STEP_ATTEMPTS * 3;
  const unavailable = () => Object.assign(new Error('Service Unavailable'), { response: { status: 503 } });
  const alerts = () => (axios.post as jest.Mock).mock.calls.map(([, body]) => body.message as string);

  it('Keeps retrying a Keycloak outage past the former limit and completes once Keycloak recovers', async () => {
    let devCalls = 0;
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient').mockImplementation(async (environment) => {
      if (environment === 'dev' && (devCalls += 1) <= OUTAGE_ATTEMPTS) throw unavailable();
      return true;
    });

    const { request, workflowId } = await enqueue();
    for (let attempt = 0; attempt < OUTAGE_ATTEMPTS; attempt += 1) await runWorkflow(workflowId);

    // Still in flight, not failed: nobody has to resubmit, and nobody can submit over it either.
    const retrying = await getWorkflowForRequest(request.id);
    expect(retrying.state).toBe('RUNNING');
    expect((await getWorkflowStep(workflowId, 'APPLY_DEV')).attempts).toBe(OUTAGE_ATTEMPTS);
    expect((await getRequest(request.id)).status).toBe('planned');
    expect(await getDeadLetters()).toHaveLength(0);
    await expect(enqueueRequestWorkflow({ ...formDataProd, id: request.id } as any)).rejects.toBeInstanceOf(
      IntegrationBusyError,
    );

    // Keycloak is back: the next attempt succeeds and the workflow runs to the end.
    await runWorkflow(workflowId);

    const workflow = await getWorkflowForRequest(request.id);
    expect(workflow.state).toBe('COMPLETED');
    expect((await getWorkflowStep(workflowId, 'APPLY_DEV')).attempts).toBe(OUTAGE_ATTEMPTS + 1);
    expect((await getRequest(request.id)).status).toBe('applied');
    expect(await getDeadLetters()).toHaveLength(0);
    expect(kcClientSpy.mock.calls.filter(([environment]) => environment === 'prod')).toHaveLength(1);

    const events = await getEventsByRequestId(request.id);
    expect(
      events.filter((event: any) => event.eventCode === 'request-create').map((event: any) => event.outcome),
    ).toEqual(['success']);

    // One alert for the whole outage, not one per attempt, saying how often it retries.
    const retryAlerts = alerts().filter((message) => message.includes('keeps retrying'));
    expect(retryAlerts).toHaveLength(1);
    expect(retryAlerts[0]).toContain(`failed step APPLY_DEV ${MAX_STEP_ATTEMPTS} times`);
    expect(retryAlerts[0]).toContain('retried every 10 minutes');

    kcClientSpy.mockRestore();
  });

  it('Keeps retrying an SDX outage without repeating Keycloak and completes once SDX recovers', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    let sdxCalls = 0;
    const sdxSpy = jest.spyOn(SdxModule, 'submitSdxRequest').mockImplementation(async () => {
      if ((sdxCalls += 1) <= OUTAGE_ATTEMPTS) {
        throw new Error('Failed to process request for SDX services', {
          cause: Object.assign(new Error('Failed to create SDX request'), { status: 502 }),
        });
      }
      return { success: true, message: 'submitted', data: { requestId: 1, resourceServers: [] } };
    });
    const request = await generateRequest(formDataProd);
    const sdx = {
      requesterId: 42,
      request: { id: request.id, clientId: 'client' },
      revokeAll: false,
      resourceServers: [],
    };
    const { workflowId } = await enqueueRequestWorkflow({ ...formDataProd, id: request.id }, { sdx });

    for (let attempt = 0; attempt <= OUTAGE_ATTEMPTS; attempt += 1) await runWorkflow(workflowId);

    expect((await getWorkflowForRequest(request.id)).state).toBe('COMPLETED');
    expect((await getWorkflowStep(workflowId, 'SDX_SUBMIT')).attempts).toBe(OUTAGE_ATTEMPTS + 1);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);
    expect(await getDeadLetters()).toHaveLength(0);

    sdxSpy.mockRestore();
    kcClientSpy.mockRestore();
  });

  it('Fails a request Keycloak rejects on its first attempt instead of retrying it forever', async () => {
    const kcClientSpy = jest
      .spyOn(IntegrationModule, 'keycloakClient')
      .mockRejectedValue(Object.assign(new Error('invalid redirect uri'), { response: { status: 400 } }));

    const { request, workflowId } = await enqueue();
    await runWorkflow(workflowId);

    expect((await getWorkflowForRequest(request.id)).state).toBe('FAILED');
    expect((await getWorkflowStep(workflowId, 'APPLY_DEV')).attempts).toBe(1);
    expect((await getRequest(request.id)).status).toBe('applyFailed');
    const [deadLetter] = await getDeadLetters();
    expect(deadLetter.reason).toContain('rejected');
    expect(deadLetter.error).toContain('invalid redirect uri');

    kcClientSpy.mockRestore();
  });

  it('Fails a request SDX rejects on its first attempt', async () => {
    jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    const sdxSpy = jest.spyOn(SdxModule, 'submitSdxRequest').mockRejectedValue(
      new Error('Failed to process request for SDX services', {
        cause: Object.assign(new Error('Failed to create SDX request'), { status: 422 }),
      }),
    );
    const request = await generateRequest(formDataProd);
    const sdx = {
      requesterId: 42,
      request: { id: request.id, clientId: 'client' },
      revokeAll: false,
      resourceServers: [],
    };
    const { workflowId } = await enqueueRequestWorkflow({ ...formDataProd, id: request.id }, { sdx });

    await runWorkflow(workflowId);

    expect((await getWorkflowForRequest(request.id)).state).toBe('FAILED');
    expect((await getWorkflowStep(workflowId, 'SDX_SUBMIT')).attempts).toBe(1);
    expect((await getRequest(request.id)).status).toBe('applyFailed');

    sdxSpy.mockRestore();
  });

  it('Still skips the notification step after its attempt limit', async () => {
    jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    const notifySpy = jest
      .spyOn(EffectsModule, 'updatePlannedIntegration')
      .mockRejectedValue(new Error('smtp unavailable'));

    const { request, workflowId } = await enqueue();
    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS * 2; attempt += 1) await runWorkflow(workflowId);

    expect((await getWorkflowStep(workflowId, 'NOTIFY')).state).toBe('SKIPPED');
    expect((await getWorkflowStep(workflowId, 'NOTIFY')).attempts).toBe(MAX_STEP_ATTEMPTS);
    expect((await getWorkflowForRequest(request.id)).state).toBe('COMPLETED');

    notifySpy.mockRestore();
  });

  it('Fails at the configured hard cap when one is set', async () => {
    mockRequiredStepAttemptLimit = 3;
    jest.spyOn(IntegrationModule, 'keycloakClient').mockRejectedValue(unavailable());

    const { request, workflowId } = await enqueue();
    for (let attempt = 0; attempt < 3; attempt += 1) await runWorkflow(workflowId);

    expect((await getWorkflowForRequest(request.id)).state).toBe('FAILED');
    expect((await getWorkflowStep(workflowId, 'APPLY_DEV')).attempts).toBe(3);
    expect((await getDeadLetters())[0].reason).toContain('attempt limit');
  });

  it('Does not send SDX an access request again once SDX has accepted it', async () => {
    jest.spyOn(IntegrationModule, 'keycloakClient').mockResolvedValue(true);
    const accepted = {
      submissionId: 'sdx-submission-1',
      requesterName: 'Test User',
      accessRequest: {
        integrationId: 1,
        clientId: 'client',
        privacyZone: '',
        policyVersion: 'SDX.R1.00',
        resourceServers: [],
      },
    };
    const sentWith: unknown[] = [];
    jest.spyOn(SdxModule, 'submitSdxRequest').mockImplementation(async (_requesterId, _request, options) => {
      sentWith.push(options.accepted);
      if (sentWith.length === 1) {
        // SDX accepts, then the Keycloak scope sync that follows fails on an outage.
        await options.onAccepted?.(accepted);
        throw new Error('Failed to process request for SDX services', { cause: unavailable() });
      }
      return { success: true, message: 'submitted', data: { requestId: 1, resourceServers: [] } };
    });
    const request = await generateRequest(formDataProd);
    const sdx = {
      requesterId: 42,
      request: { id: request.id, clientId: 'client' },
      revokeAll: false,
      resourceServers: [],
    };
    const { workflowId } = await enqueueRequestWorkflow({ ...formDataProd, id: request.id }, { sdx });

    await runWorkflow(workflowId);
    await runWorkflow(workflowId);

    // The retry is handed what SDX accepted instead of sending it again.
    expect(sentWith).toEqual([undefined, accepted]);
    const step = await getWorkflowStep(workflowId, 'SDX_SUBMIT');
    expect(step.state).toBe('COMPLETED');
    expect(step.result).toMatchObject({ submitted: true, submissionId: 'sdx-submission-1' });
    expect((await getWorkflowForRequest(request.id)).state).toBe('COMPLETED');
  });

  it('Hands an awaited workflow back as in progress once its next retry is beyond the wait', async () => {
    mockRetryDelayMs = 600_000;
    jest.spyOn(IntegrationModule, 'keycloakClient').mockRejectedValue(unavailable());
    const request = await generateRequest(formDataProd);
    const enqueued = await enqueueRequestWorkflow({ ...formDataProd, id: request.id });

    const startedAt = Date.now();
    const result = await executeEnqueuedWorkflow(enqueued, { awaitCompletion: true });

    // Returned at once, not after the old ~2.5 minutes of sleeping through the remaining rounds.
    expect(Date.now() - startedAt).toBeLessThan(5_000);
    expect(result.state).toBe('RUNNING');
    expect((await getWorkflowStep(enqueued.workflowId, 'APPLY_DEV')).attempts).toBe(1);

    // Still retrying is not a failure for the caller; ending FAILED still is.
    expect(() => assertWorkflowCompleted({ ...result, operationId: 'operation' })).not.toThrow();
    expect(() => assertWorkflowCompleted({ ...result, state: 'FAILED' as any, operationId: 'operation' })).toThrow(
      /ended in FAILED/,
    );
  });
});

describe('Request workflow - pod shutdown', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterEach(() => {
    resumeTakingWork();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Releases a workflow between steps once its pod is shutting down, for another pod to finish', async () => {
    jest.spyOn(IntegrationModule, 'keycloakClient').mockImplementation(async (environment) => {
      // SIGTERM arrives while APPLY_DEV is running.
      if (environment === 'dev') stopTakingWork();
      return true;
    });
    const { request, workflowId } = await enqueue();

    await runWorkflow(workflowId);

    const released = await getWorkflowForRequest(request.id);
    expect(released.state).toBe('RUNNING');
    expect(released.claimedBy).toBeNull();
    const steps = await getWorkflowSteps(workflowId);
    const applyDev = steps.findIndex((step: any) => step.name === 'APPLY_DEV');
    expect(steps[applyDev].state).toBe('COMPLETED');
    expect(steps[applyDev + 1].state).toBe('PENDING');

    // This pod claims nothing more.
    expect(await runWorkflow(workflowId)).toBeNull();
    expect((await drainWorkflows()).processed).toBe(0);

    // Another pod (here, the same one taking work again) picks it up right where it stopped.
    resumeTakingWork();
    expect(await runWorkflow(workflowId)).toBe('COMPLETED');
  });
});

describe('Request workflow - retry schedule', () => {
  const RETRY_ENV = [
    'WORKFLOW_MAX_STEP_ATTEMPTS',
    'WORKFLOW_RETRY_BASE_DELAY_MS',
    'WORKFLOW_RETRY_MAX_DELAY_MS',
    'WORKFLOW_SLOW_RETRY_INTERVAL_MS',
  ];

  /** The real backoff module, read with the production defaults rather than this suite's mock and test env. */
  const loadBackoff = (env: Record<string, string> = {}): typeof import('@app/workflow/backoff') => {
    const saved = Object.fromEntries(RETRY_ENV.map((name) => [name, process.env[name]]));
    RETRY_ENV.forEach((name) => delete process.env[name]);
    Object.assign(process.env, env);
    let backoff: typeof import('@app/workflow/backoff') | undefined;
    jest.isolateModules(() => {
      backoff = jest.requireActual<typeof import('@app/workflow/backoff')>('@app/workflow/backoff');
    });
    RETRY_ENV.forEach((name) =>
      saved[name] === undefined ? delete process.env[name] : (process.env[name] = saved[name]),
    );
    return backoff!;
  };

  it('backs off exponentially, with jitter, for the first five attempts', () => {
    const { backoffDelayMs } = loadBackoff();
    [2_000, 4_000, 8_000, 16_000].forEach((ceiling, index) => {
      for (let sample = 0; sample < 50; sample += 1) {
        const delay = backoffDelayMs(index + 1);
        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(ceiling);
      }
    });
  });

  it.each([5, 6, 12, 500])('waits exactly 10 minutes after attempt %s', (attempt) => {
    const { backoffDelayMs, nextRunAfter } = loadBackoff();
    expect(backoffDelayMs(attempt)).toBe(10 * 60_000);

    const before = Date.now();
    const { runAfter, delayMs } = nextRunAfter(attempt);
    expect(delayMs).toBe(10 * 60_000);
    expect(runAfter.getTime()).toBeGreaterThanOrEqual(before + 10 * 60_000);
  });

  it('takes the slow interval and its threshold from the environment', () => {
    const { backoffDelayMs } = loadBackoff({
      WORKFLOW_MAX_STEP_ATTEMPTS: '3',
      WORKFLOW_SLOW_RETRY_INTERVAL_MS: '300000',
    });
    expect(backoffDelayMs(2)).toBeLessThan(4_000);
    expect(backoffDelayMs(3)).toBe(300_000);
  });
});

describe('Request workflow - which failures are retried', () => {
  const withStatus = (status: number) => Object.assign(new Error(`status ${status}`), { status });

  it.each([400, 404, 422])('treats a %s as a rejected request that retrying cannot fix', (status) => {
    expect(isPermanentError(withStatus(status))).toBe(true);
  });

  // A 409 is a race between converging writers (a shared SDX scope, a retry overlapping a timed-out attempt).
  it.each([401, 403, 408, 409, 425, 429, 500, 502, 503, 504])('retries a %s', (status) => {
    expect(isPermanentError(withStatus(status))).toBe(false);
  });

  it('reads the status where axios, the Keycloak admin client and http-errors put it', () => {
    expect(isPermanentError({ response: { status: 400 } })).toBe(true);
    expect(isPermanentError({ statusCode: 400 })).toBe(true);
    expect(isPermanentError(withStatus(400))).toBe(true);
  });

  it('follows the cause chain to the nearest status', () => {
    expect(isPermanentError(new Error('wrapped', { cause: new Error('inner', { cause: withStatus(400) }) }))).toBe(
      true,
    );
    expect(isPermanentError(new Error('wrapped', { cause: withStatus(503) }))).toBe(false);
  });

  it('retries a failure that carries no status, such as a dropped connection', () => {
    expect(isPermanentError(new TypeError('fetch failed'))).toBe(false);
    expect(isPermanentError(new Error('wrapped', { cause: new Error('ECONNREFUSED') }))).toBe(false);
  });

  it('fails a bug in our own code at once instead of retrying it every 10 minutes', () => {
    expect(isPermanentError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(true);
    expect(isPermanentError(new ReferenceError('client is not defined'))).toBe(true);
    expect(
      isPermanentError(
        new Error('Keycloak could not apply the dev client configuration', {
          cause: new TypeError('x is not a function'),
        }),
      ),
    ).toBe(true);
  });

  it('still retries the TypeError Node raises for a connection failure, and a status nearer in the chain', () => {
    const connectionFailure = new TypeError('fetch failed', {
      cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }),
    });
    expect(isPermanentError(connectionFailure)).toBe(false);
    expect(isPermanentError(new Error('wrapped', { cause: connectionFailure }))).toBe(false);
    expect(isPermanentError(Object.assign(new TypeError('bad gateway body'), { status: 502 }))).toBe(false);
    expect(isPermanentError(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))).toBe(false);
  });

  it('lets an explicit step error decide over the status it wraps', () => {
    expect(isPermanentError(new TransientStepError('try again', withStatus(400)))).toBe(false);
    expect(isPermanentError(new PermanentStepError('give up', withStatus(503)))).toBe(true);
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
