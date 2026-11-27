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
import { IntegrationBusyError } from '@app/workflow/types';
import * as EffectsModule from '@app/workflow/effects';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { userActor, withActor } from '@sso/audit/server';
import { enqueueIntegrationWorkflow } from '@app/controllers/requests';
import * as SdxModule from '@app/controllers/sdx-services';

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
    expect(sdx).toHaveBeenCalledWith(42, sdxContext.request, {
      revokeAll: false,
      resourceServers: sdxContext.resourceServers,
    });
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
    expect(sdx).toHaveBeenCalledWith(42, sdxContext.request, { revokeAll: true, resourceServers: [] });
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
