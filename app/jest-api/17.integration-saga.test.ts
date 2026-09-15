import axios from 'axios';
import { cleanUpDatabaseTables } from './helpers/utils';
import { createMockSendEmail } from './mocks/mail';
import * as IntegrationModule from '@app/keycloak/integration';
import { formDataProd } from './helpers/fixtures';
import {
  getRequest,
  generateRequest,
  getEventsByRequestId,
  getSagaForRequest,
  getSagaSteps,
  getSagaStep,
  getSagas,
  getDeadLetters,
} from './helpers/modules/integrations';
import { EMAILS, EVENTS } from '@app/shared/enums';
import { createEvent } from '@app/queries/event';
import { enqueueIntegrationSaga, getIntegrationProgress } from '@app/saga/integration-saga';
import { drainSagas, runSaga } from '@app/saga/orchestrator';

jest.mock('@app/keycloak/adminClient');

// This suite drives the orchestrator step by step, so sagas are persisted but never auto-started.
process.env.SAGA_EXECUTION_MODE = 'manual';

const MAX_STEP_ATTEMPTS = 5;

// Pin the retry policy: no jitter, no waiting, and a `runAfter` in the past so a retried saga is
// immediately re-claimable by the next `drainSagas()` call.
jest.mock('@app/saga/backoff', () => ({
  MAX_STEP_ATTEMPTS: 5,
  CLAIM_LEASE_SECONDS: 300,
  IN_PROCESS_RETRY_CEILING_MS: 0,
  backoffDelayMs: () => 0,
  nextRunAfter: () => ({ runAfter: new Date(Date.now() - 1000), delayMs: 0 }),
}));

const enqueue = async (payload: any = formDataProd, options: any = {}) => {
  const request = await generateRequest(payload);
  const result = await enqueueIntegrationSaga({ ...payload, id: request.id }, options);
  return { request, ...result };
};

describe('Integration saga - happy path', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Persists the saga and its full step plan before executing anything', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, sagaId } = await enqueue();

    // Nothing has run yet - the workflow is durable from the moment it is accepted.
    expect(kcClientSpy).not.toHaveBeenCalled();

    const saga = await getSagaForRequest(request.id);
    expect(saga.state).toBe('PENDING');
    expect(saga.id).toBe(sagaId);

    const steps = await getSagaSteps(sagaId);
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

  it('Applies every environment, completes the saga, marks the request applied and emails the requester', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    const emailResults = createMockSendEmail();

    const { request, sagaId } = await enqueue();
    await runSaga(sagaId);

    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    const saga = await getSagaForRequest(request.id);
    expect(saga.state).toBe('COMPLETED');
    expect(saga.claimedBy).toBeNull();

    const steps = await getSagaSteps(sagaId);
    expect(steps.every((step: any) => step.state === 'COMPLETED')).toBe(true);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applied');

    expect(emailResults.length).toBe(1);
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
    const { sagaId } = await enqueueIntegrationSaga({ ...formDataProd, id: request.id } as any);
    await runSaga(sagaId);

    const saga = await getSagaForRequest(request.id);
    expect(saga.context.isCreate).toBe(false);

    expect(emailResults.length).toBe(1);
    expect(emailResults[0].code).toBe(EMAILS.UPDATE_INTEGRATION_APPLIED);

    kcClientSpy.mockRestore();
  });

  it('Passes the existing client id through to Keycloak so a renamed client is migrated', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { sagaId } = await enqueue(formDataProd, { existingClientId: 'existing-id' });
    await runSaga(sagaId);

    expect(kcClientSpy).toHaveBeenCalledWith('dev', expect.anything(), 'existing-id');

    kcClientSpy.mockRestore();
  });
});

describe('Integration saga - idempotency and de-duplication', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Returns the in-flight saga instead of starting a second workflow for the same integration', async () => {
    const { request, sagaId, created } = await enqueue();
    expect(created).toBe(true);

    const duplicate = await enqueueIntegrationSaga({ ...formDataProd, id: request.id } as any);
    expect(duplicate.created).toBe(false);
    expect(duplicate.sagaId).toBe(sagaId);

    expect((await getSagas()).length).toBe(1);
  });

  it('Re-running a completed saga is a safe no-op', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { sagaId } = await enqueue();
    await runSaga(sagaId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    // A redelivered command must not re-apply anything.
    await runSaga(sagaId);
    expect(kcClientSpy).toHaveBeenCalledTimes(3);

    kcClientSpy.mockRestore();
  });

  it('Resumes from the failed step rather than replaying completed steps', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy
      .mockResolvedValueOnce(true) // dev
      .mockResolvedValueOnce(false) // test fails
      .mockImplementation(() => Promise.resolve(true));

    const { sagaId } = await enqueue();
    await runSaga(sagaId);

    expect(await getSagaStep(sagaId, 'APPLY_DEV').then((step: any) => step.state)).toBe('COMPLETED');
    expect(await getSagaStep(sagaId, 'APPLY_TEST').then((step: any) => step.state)).toBe('FAILED');

    kcClientSpy.mockClear();
    await drainSagas();

    // dev is not re-applied; the saga picks up at test.
    expect(kcClientSpy.mock.calls.map((call) => call[0])).toEqual(['test', 'prod']);

    const saga = await getSagaForRequest((await getSagas())[0].requestId);
    expect(saga.state).toBe('COMPLETED');

    kcClientSpy.mockRestore();
  });

  it('Does not write duplicate audit events when a step is replayed', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, sagaId } = await enqueue();
    await runSaga(sagaId);
    await runSaga(sagaId);

    const events = await getEventsByRequestId(request.id);
    const planEvents = events.filter((event: any) => event.eventCode === EVENTS.REQUEST_PLAN_SUCCESS);
    expect(planEvents.length).toBe(1);

    kcClientSpy.mockRestore();
  });
});

describe('Integration saga - retries and dead lettering', () => {
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

    const { request, sagaId } = await enqueue();
    await runSaga(sagaId);

    let step = await getSagaStep(sagaId, 'APPLY_DEV');
    expect(step.state).toBe('FAILED');
    expect(step.attempts).toBe(1);

    await drainSagas();

    step = await getSagaStep(sagaId, 'APPLY_DEV');
    expect(step.state).toBe('COMPLETED');
    expect(step.attempts).toBe(2);

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applied');

    kcClientSpy.mockRestore();
  });

  it('Dead letters the saga and alerts operations once retries are exhausted', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(false));
    jest.spyOn(axios, 'post').mockImplementation(() => Promise.resolve({ data: [] }) as any);
    process.env.RC_SSO_OPS_WEBHOOK = 'https://example.test/hook';

    const { request, sagaId } = await enqueue();

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await drainSagas();

    const step = await getSagaStep(sagaId, 'APPLY_DEV');
    expect(step.attempts).toBe(MAX_STEP_ATTEMPTS);

    const saga = await getSagaForRequest(request.id);
    expect(saga.state).toBe('FAILED');
    expect(saga.claimedBy).toBeNull();

    const updatedRequest = await getRequest(request.id);
    expect(updatedRequest.status).toBe('applyFailed');

    const deadLetters = await getDeadLetters();
    expect(deadLetters.length).toBe(1);
    expect(deadLetters[0].failedStep).toBe('APPLY_DEV');

    expect(axios.post).toHaveBeenCalled();
    const [, alertBody] = (axios.post as jest.Mock).mock.calls[0];
    expect(alertBody.message).toContain('requires manual intervention');

    const events = await getEventsByRequestId(request.id);
    expect(events.map((event: any) => event.eventCode)).toContain(EVENTS.REQUEST_APPLY_FAILURE);

    kcClientSpy.mockRestore();
  });
});

describe('Integration saga - no rollback on failure', () => {
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

    const { request, sagaId } = await enqueue();

    for (let attempt = 0; attempt < MAX_STEP_ATTEMPTS; attempt += 1) await drainSagas();

    // Nothing is ever torn down.
    expect(kcClientSpy.mock.calls.some((call: any) => call[1]?.archived === true)).toBe(false);
    // dev/test are applied exactly once and never re-applied by the retries of prod.
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'dev').length).toBe(1);
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'test').length).toBe(1);
    expect(kcClientSpy.mock.calls.filter((call: any) => call[0] === 'prod').length).toBe(MAX_STEP_ATTEMPTS);

    const steps = await getSagaSteps(sagaId);
    const byName = Object.fromEntries(steps.map((step: any) => [step.name, step.state]));
    expect(byName.APPLY_DEV).toBe('COMPLETED');
    expect(byName.APPLY_TEST).toBe('COMPLETED');
    expect(byName.APPLY_PROD).toBe('FAILED');

    const saga = await getSagaForRequest(request.id);
    expect(saga.state).toBe('FAILED');
    expect(saga.currentStep).toBe('APPLY_PROD');

    kcClientSpy.mockRestore();
  });

  it('Resumes from the failed step when the cron tick retries a recovered saga', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation((environment: string) => Promise.resolve(environment !== 'prod'));

    const { request, sagaId } = await enqueue();
    await runSaga(sagaId);

    expect(await getSagaStep(sagaId, 'APPLY_PROD').then((step: any) => step.state)).toBe('FAILED');

    // Keycloak recovers before the next tick.
    kcClientSpy.mockClear();
    kcClientSpy.mockImplementation(() => Promise.resolve(true));
    await drainSagas();

    expect(kcClientSpy.mock.calls.map((call: any) => call[0])).toEqual(['prod']);

    const saga = await getSagaForRequest(request.id);
    expect(saga.state).toBe('COMPLETED');
    expect((await getRequest(request.id)).status).toBe('applied');

    kcClientSpy.mockRestore();
  });
});

describe('Integration saga - progress projection', () => {
  beforeEach(async () => {
    await cleanUpDatabaseTables();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('Reports an active saga while it runs and an inactive one once complete', async () => {
    const kcClientSpy = jest.spyOn(IntegrationModule, 'keycloakClient');
    kcClientSpy.mockImplementation(() => Promise.resolve(true));

    const { request, sagaId } = await enqueue();

    let progress = await getIntegrationProgress(request.id);
    expect(progress?.active).toBe(true);
    expect(progress?.state).toBe('PENDING');
    expect(progress?.steps.length).toBe(6);
    expect(progress?.steps[0].label).toBe('Request received and validated');

    await runSaga(sagaId);

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
