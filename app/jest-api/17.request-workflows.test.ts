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
import { EMAILS, EVENTS } from '@app/shared/enums';
import { createEvent } from '@app/queries/event';
import { enqueueRequestWorkflow, getIntegrationProgress } from '@app/workflow/request-workflow';
import { drainWorkflows, runWorkflow } from '@app/workflow/orchestrator';

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

    const events = await getEventsByRequestId(request.id);
    const eventCodes = events.map((event: any) => event.eventCode);
    expect(eventCodes).toContain(EVENTS.REQUEST_PLAN_SUCCESS);
    expect(eventCodes).toContain(EVENTS.REQUEST_APPLY_SUCCESS);

    kcClientSpy.mockRestore();
  });

  it('Sends an update email when the integration was previously applied', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const request = await generateRequest(formDataProd);
    await createEvent({ eventCode: EVENTS.REQUEST_APPLY_SUCCESS, requestId: request.id });

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
    expect(duplicate.created).toBe(false);
    expect(duplicate.workflowId).toBe(workflowId);

    expect(await getWorkflows()).toHaveLength(1);
  });

  it('Re-running a completed workflow is a safe no-op', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { workflowId } = await enqueue();
    await runWorkflow(workflowId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    // A redelivered command must not re-apply anything.
    await runWorkflow(workflowId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

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
    const planEvents = events.filter((event: any) => event.eventCode === EVENTS.REQUEST_PLAN_SUCCESS);
    expect(planEvents).toHaveLength(1);

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
    expect(events.map((event: any) => event.eventCode)).toContain(EVENTS.REQUEST_APPLY_FAILURE);

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
