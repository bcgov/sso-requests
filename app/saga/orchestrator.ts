import axios from 'axios';
import { EVENTS } from '@app/shared/enums';
import { models } from '@app/shared/sequelize/models/models';
import { createSagaLogger } from './logger';
import { CLAIM_LEASE_SECONDS, IN_PROCESS_RETRY_CEILING_MS, MAX_STEP_ATTEMPTS, nextRunAfter } from './backoff';
import {
  claimSaga,
  getSagaSteps,
  heartbeatSaga,
  recordDeadLetter,
  releaseSaga,
  updateSaga,
  updateStep,
  WORKER_ID,
} from './store';
import { buildIntegrationSagaSteps, emitSagaEventOnce } from './steps/integration';
import {
  isPermanentError,
  SagaLogger,
  SagaRecord,
  SagaState,
  SagaStepDefinition,
  SagaStepRecord,
  SagaType,
  STEP_NAMES,
  StepState,
} from './types';

const FINISHED_STEP_STATES = [StepState.COMPLETED, StepState.SKIPPED];

/**
 * How sagas are executed once persisted:
 *   background   - default. Kick off in-process, retries are re-armed with timers, cron recovers.
 *   synchronous  - run to completion before returning. Used by integration tests.
 *   manual       - persist only; the caller drives execution. Used by the orchestrator's own tests.
 */
export type SagaExecutionMode = 'background' | 'synchronous' | 'manual';

export const sagaExecutionMode = (): SagaExecutionMode =>
  (process.env.SAGA_EXECUTION_MODE as SagaExecutionMode) || 'background';

export const backgroundExecutionEnabled = () => sagaExecutionMode() === 'background';

const errorMessage = (err: unknown): string => {
  if (!err) return 'unknown error';
  if (err instanceof Error) return err.message || err.name;
  return typeof err === 'string' ? err : JSON.stringify(err);
};

const setRequestStatus = async (requestId: number, status: string) => {
  await models.request.update({ status }, { where: { id: requestId } });
};

const sagaLoggerFor = (saga: SagaRecord): SagaLogger =>
  createSagaLogger({
    correlationId: saga.correlationId,
    sagaId: saga.id,
    requestId: saga.requestId,
    sagaType: saga.type,
    worker: WORKER_ID,
  });

/**
 * Keeps the claim fresh while a step is running so a slow Keycloak call cannot have its lease
 * stolen by the recovery tick and get executed twice concurrently.
 */
const withHeartbeat = async <T>(sagaId: string, fn: () => Promise<T>): Promise<T> => {
  const timer = setInterval(() => {
    heartbeatSaga(sagaId).catch(() => undefined);
  }, Math.max(1, Math.floor(CLAIM_LEASE_SECONDS / 3)) * 1000);
  timer.unref?.();

  try {
    return await fn();
  } finally {
    clearInterval(timer);
  }
};

const alertOps = async (message: string) => {
  const webhook = process.env.RC_SSO_OPS_WEBHOOK;
  if (!webhook) return;

  const prefixed = process.env.NEXT_PUBLIC_APP_ENV === 'production' ? message : `SANDBOX: ${message}`;

  try {
    await axios.post(
      webhook,
      { projectName: 'integration_saga', message: prefixed, statusCode: 'ERROR' },
      { headers: { Accept: 'application/json' } },
    );
  } catch (err) {
    console.error('failed to publish saga ops alert', err);
  }
};

const scheduleInProcessRetry = (sagaId: string, delayMs: number) => {
  if (!backgroundExecutionEnabled() || delayMs > IN_PROCESS_RETRY_CEILING_MS) return;

  const timer = setTimeout(() => {
    runSaga(sagaId).catch((err) => console.error('saga retry failed', err));
  }, delayMs);
  timer.unref?.();
};

const stepDefinitionsByName = (saga: SagaRecord): Map<string, SagaStepDefinition> =>
  new Map(buildIntegrationSagaSteps(saga).map((definition) => [definition.name, definition]));

/** Terminal success: the workflow ran to completion and the claim is dropped. */
const completeSaga = async (saga: SagaRecord, log: SagaLogger) => {
  await releaseSaga(saga.id, {
    state: SagaState.COMPLETED,
    currentStep: null,
    completedAt: new Date(),
    lastError: null,
  });

  saga.state = SagaState.COMPLETED;
  log.info('saga completed', { state: SagaState.COMPLETED });
  log.metric('saga.duration', Date.now() - new Date(saga.startedAt || saga.createdAt).getTime());
};

/**
 * Terminal failure, reached only once a step has burned through every retry (or raised a permanent
 * error). Work that already succeeded is deliberately left in place - there is no rollback - so a
 * manual or cron-driven retry can resume from exactly this step.
 */
const failSaga = async (
  saga: SagaRecord,
  log: SagaLogger,
  params: { failedStep: string | null; reason: string; error: string },
) => {
  const failedDuringPlanning = params.failedStep === STEP_NAMES.PLAN;
  const isRestore = saga.type === SagaType.INTEGRATION_RESTORE;

  await releaseSaga(saga.id, {
    state: SagaState.FAILED,
    currentStep: params.failedStep,
    completedAt: new Date(),
    lastError: params.error,
  });

  saga.state = SagaState.FAILED;
  await setRequestStatus(saga.requestId, failedDuringPlanning ? 'planFailed' : 'applyFailed');

  const eventCode = (() => {
    if (failedDuringPlanning) return EVENTS.REQUEST_PLAN_FAILURE;
    return isRestore ? EVENTS.REQUEST_RESTORE_FAILURE : EVENTS.REQUEST_APPLY_FAILURE;
  })();

  await emitSagaEventOnce(saga, eventCode, { reason: params.reason, error: params.error });

  await recordDeadLetter({ saga, failedStep: params.failedStep, reason: params.reason, error: params.error });

  log.error('saga failed and was dead-lettered', {
    state: SagaState.FAILED,
    failedStep: params.failedStep,
    reason: params.reason,
    error: params.error,
  });

  await alertOps(
    `Integration saga ${saga.id} for request ${saga.requestId} (${saga.payload?.clientId || 'unknown client'}) ` +
      `failed at step ${params.failedStep || 'unknown'} and requires manual intervention. ` +
      `Reason: ${params.reason}. Correlation id: ${saga.correlationId}.`,
  );
};

interface PhaseResult {
  /** Set when the saga yielded the worker and will be retried later. */
  retryScheduled?: boolean;
  done?: boolean;
}

const runNextStep = async (
  saga: SagaRecord,
  steps: SagaStepRecord[],
  definitions: Map<string, SagaStepDefinition>,
  log: SagaLogger,
): Promise<PhaseResult> => {
  const step = steps.find((candidate) => !FINISHED_STEP_STATES.includes(candidate.state));

  if (!step) {
    await completeSaga(saga, log);
    return { done: true };
  }

  const definition = definitions.get(step.name);
  if (!definition) {
    // The persisted plan no longer matches the code. Never guess - fail loudly and dead-letter.
    const reason = `unknown step "${step.name}" in persisted saga plan`;
    await failSaga(saga, log, { failedStep: step.name, reason, error: reason });
    return { done: true };
  }

  const attempt = step.attempts + 1;
  const stepLog = log.child({ step: step.name, attempt });
  const startedAt = Date.now();

  await updateStep(step.id, { state: StepState.RUNNING, attempts: attempt, startedAt: new Date() });
  await updateSaga(saga.id, { currentStep: step.name });
  saga.currentStep = step.name;
  stepLog.info('step started', { state: StepState.RUNNING });

  try {
    const result = await withHeartbeat(saga.id, () =>
      definition.execute({ saga, step: { ...step, attempts: attempt }, log: stepLog }),
    );

    await updateStep(step.id, {
      state: StepState.COMPLETED,
      result: result ?? null,
      completedAt: new Date(),
      lastError: null,
    });

    stepLog.info('step completed', { state: StepState.COMPLETED });
    stepLog.metric('saga.step.duration', Date.now() - startedAt, { step: step.name });
    return {};
  } catch (err) {
    const message = errorMessage(err);
    const permanent = isPermanentError(err);
    const exhausted = attempt >= MAX_STEP_ATTEMPTS;

    await updateStep(step.id, { state: StepState.FAILED, lastError: message });
    stepLog.error('step failed', { state: StepState.FAILED, error: message, permanent, exhausted });

    if (permanent || exhausted) {
      await failSaga(saga, log, {
        failedStep: step.name,
        reason: permanent
          ? `step ${step.name} failed permanently: ${message}`
          : `step ${step.name} exhausted retries: ${message}`,
        error: message,
      });
      return { done: true };
    }

    // Steps that already completed stay completed; the retry picks up right here.
    const { runAfter, delayMs } = nextRunAfter(attempt);
    await releaseSaga(saga.id, { runAfter, lastError: message });
    stepLog.warn('step retry scheduled', { delayMs, runAfter });
    scheduleInProcessRetry(saga.id, delayMs);
    return { retryScheduled: true };
  }
};

/**
 * Drives a claimed saga until it either finishes, yields for a scheduled retry, or exhausts the
 * per-invocation iteration budget (which simply leaves it claimable for the next tick).
 */
const execute = async (claimed: SagaRecord): Promise<SagaState> => {
  const saga = claimed;
  const log = sagaLoggerFor(saga);
  const definitions = stepDefinitionsByName(saga);

  if (saga.state === SagaState.PENDING) {
    saga.state = SagaState.RUNNING;
    await updateSaga(saga.id, { state: SagaState.RUNNING, startedAt: saga.startedAt || new Date() });
    log.info('saga started', { state: SagaState.RUNNING });
  }

  const steps = await getSagaSteps(saga.id);
  const maxIterations = steps.length + 1;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const current = await getSagaSteps(saga.id);
    const result = await runNextStep(saga, current, definitions, log);

    if (result.retryScheduled) return saga.state;
    if (result.done) return saga.state;
  }

  log.warn('saga iteration budget exhausted, releasing for the next tick', { state: saga.state });
  await releaseSaga(saga.id);
  return saga.state;
};

/** Claims a specific saga and runs it. Returns null when another worker already owns it. */
export const runSaga = async (sagaId: string): Promise<SagaState | null> => {
  const saga = await claimSaga(sagaId);
  if (!saga) return null;

  try {
    return await execute(saga);
  } catch (err) {
    // Unexpected orchestrator error: drop the claim so the recovery tick can retry rather than
    // leaving the saga wedged behind a stale lease.
    console.error('saga orchestration error', err);
    await releaseSaga(sagaId, { lastError: errorMessage(err) });
    return null;
  }
};

/**
 * Recovery entry point used by the cron tick. Picks up anything runnable: brand new sagas whose
 * originating pod died before starting them, sagas waiting on a backoff window, and sagas whose
 * lease expired mid-flight.
 */
export const drainSagas = async (maxSagas: number = 25): Promise<{ processed: number }> => {
  let processed = 0;

  for (let i = 0; i < maxSagas; i += 1) {
    const saga = await claimSaga();
    if (!saga) break;

    processed += 1;

    try {
      await execute(saga);
    } catch (err) {
      console.error('saga orchestration error', err);
      await releaseSaga(saga.id, { lastError: errorMessage(err) });
    }
  }

  if (processed > 0) console.info(`integration saga tick processed ${processed} saga(s)`);
  return { processed };
};
