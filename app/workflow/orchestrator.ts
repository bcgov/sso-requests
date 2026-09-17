import axios from 'axios';
import { EVENTS } from '@app/shared/enums';
import { models } from '@app/shared/sequelize/models/models';
import { createWorkflowLogger } from './logger';
import {
  CLAIM_LEASE_SECONDS,
  IN_PROCESS_RETRY_CEILING_MS,
  MAX_STEP_ATTEMPTS,
  nextRunAfter,
  STEP_TIMEOUT_MS,
} from './backoff';
import {
  claimWorkflow,
  getWorkflowState,
  getWorkflowSteps,
  heartbeatWorkflow,
  promoteOrphanedQueuedWorkflows,
  promoteQueuedWorkflow,
  recordRequestWorkflowFailure,
  releaseWorkflow,
  releaseWorkflowIfActive,
  updateStep,
  updateWorkflow,
  WORKER_ID,
} from './store';
import { buildIntegrationWorkflowSteps, emitWorkflowEventOnce } from './steps/integration';
import {
  CLAIMABLE_WORKFLOW_STATES,
  isPermanentError,
  STEP_NAMES,
  StepState,
  TransientStepError,
  WorkflowLogger,
  WorkflowRecord,
  WorkflowState,
  WorkflowStepDefinition,
  WorkflowStepRecord,
  WorkflowType,
} from './types';

const FINISHED_STEP_STATES = new Set([StepState.COMPLETED, StepState.SKIPPED]);

/**
 * How workflows are executed once persisted:
 *   background   - default. Kick off in-process, retries are re-armed with timers, cron recovers.
 *   synchronous  - run to completion before returning. Used by integration tests.
 *   manual       - persist only; the caller drives execution. Used by the orchestrator's own tests.
 */
export type WorkflowExecutionMode = 'background' | 'synchronous' | 'manual';

export const workflowExecutionMode = (): WorkflowExecutionMode =>
  (process.env.WORKFLOW_EXECUTION_MODE as WorkflowExecutionMode) || 'background';

export const backgroundExecutionEnabled = () => workflowExecutionMode() === 'background';

const errorMessage = (err: unknown): string => {
  if (!err) return 'unknown error';
  if (err instanceof Error) return err.message || err.name;
  return typeof err === 'string' ? err : JSON.stringify(err);
};

const setRequestStatus = async (requestId: number, status: string) => {
  await models.request.update({ status }, { where: { id: requestId } });
};

const workflowLoggerFor = (workflow: WorkflowRecord): WorkflowLogger =>
  createWorkflowLogger({
    correlationId: workflow.correlationId,
    workflowId: workflow.id,
    requestId: workflow.requestId,
    workflowType: workflow.type,
    worker: WORKER_ID,
  });

/**
 * Keeps the claim fresh while a step is running so a slow Keycloak call cannot have its lease
 * stolen by the recovery tick and get executed twice concurrently.
 */
const withHeartbeat = async <T>(workflowId: string, fn: () => Promise<T>): Promise<T> => {
  const timer = setInterval(() => {
    heartbeatWorkflow(workflowId).catch(() => undefined);
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
      { projectName: 'request_workflows', message: prefixed, statusCode: 'ERROR' },
      { headers: { Accept: 'application/json' } },
    );
  } catch (err) {
    console.error('failed to publish workflow ops alert', err);
  }
};

const scheduleInProcessRetry = (workflowId: string, delayMs: number) => {
  if (!backgroundExecutionEnabled() || delayMs > IN_PROCESS_RETRY_CEILING_MS) return;

  const timer = setTimeout(() => {
    runWorkflow(workflowId).catch((err) => console.error('workflow retry failed', err));
  }, delayMs);
  timer.unref?.();
};

/**
 * Bounds a single step. The underlying call cannot be cancelled, so the loser may still be in flight -
 * acceptable because every step converges on the same desired state, and the alternative is a workflow
 * wedged in RUNNING forever behind a heartbeat that never stops.
 */
const withTimeout = <T>(work: Promise<T>, ms: number, step: string): Promise<T> => {
  if (ms <= 0) return work;

  let timer: ReturnType<typeof setTimeout>;
  const expiry = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TransientStepError(`step ${step} timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });

  return Promise.race([work, expiry]).finally(() => clearTimeout(timer)) as Promise<T>;
};

const stepDefinitionsByName = (workflow: WorkflowRecord): Map<string, WorkflowStepDefinition> =>
  new Map(buildIntegrationWorkflowSteps(workflow).map((definition) => [definition.name, definition]));

/** Hands ownership to a submission that arrived while this workflow was in flight. */
const startQueuedWorkflow = async (workflow: WorkflowRecord, log: WorkflowLogger) => {
  const promoted = await promoteQueuedWorkflow(workflow.requestId);
  if (!promoted) return;

  log.info('promoted queued workflow', { promotedWorkflowId: promoted });

  if (backgroundExecutionEnabled()) {
    runWorkflow(promoted).catch((err) => log.error('queued workflow kickoff failed', { error: String(err) }));
  }
};

/** Terminal success: the workflow ran to completion and the claim is dropped. */
const completeWorkflow = async (workflow: WorkflowRecord, log: WorkflowLogger) => {
  const won = await releaseWorkflowIfActive(workflow.id, {
    state: WorkflowState.COMPLETED,
    currentStep: null,
    completedAt: new Date(),
    lastError: null,
  });

  if (!won) {
    log.warn('workflow was superseded before it could complete');
    return;
  }

  workflow.state = WorkflowState.COMPLETED;
  log.info('workflow completed', { state: WorkflowState.COMPLETED });
  log.metric('workflow.duration', Date.now() - new Date(workflow.startedAt || workflow.createdAt).getTime());
  await startQueuedWorkflow(workflow, log);
};

/**
 * Terminal failure, reached only once a step has burned through every retry (or raised a permanent
 * error). Work that already succeeded is deliberately left in place - there is no rollback - so a
 * manual or cron-driven retry can resume from exactly this step.
 */
const failWorkflow = async (
  workflow: WorkflowRecord,
  log: WorkflowLogger,
  params: { failedStep: string | null; reason: string; error: string },
) => {
  const failedDuringPlanning = params.failedStep === STEP_NAMES.PLAN;
  const isRestore = workflow.type === WorkflowType.INTEGRATION_RESTORE;

  const won = await releaseWorkflowIfActive(workflow.id, {
    state: WorkflowState.FAILED,
    currentStep: params.failedStep,
    completedAt: new Date(),
    lastError: params.error,
  });

  // A delete superseded us; its own outcome owns the request status and the audit trail now.
  if (!won) {
    log.warn('workflow was superseded before it could fail, skipping status write and dead letter');
    return;
  }

  workflow.state = WorkflowState.FAILED;
  await setRequestStatus(workflow.requestId, failedDuringPlanning ? 'planFailed' : 'applyFailed');

  const eventCode = (() => {
    if (failedDuringPlanning) return EVENTS.REQUEST_PLAN_FAILURE;
    return isRestore ? EVENTS.REQUEST_RESTORE_FAILURE : EVENTS.REQUEST_APPLY_FAILURE;
  })();

  await emitWorkflowEventOnce(workflow, eventCode, { reason: params.reason, error: params.error });

  await recordRequestWorkflowFailure({
    workflow: workflow,
    failedStep: params.failedStep,
    reason: params.reason,
    error: params.error,
  });

  log.error('workflow failed and was dead-lettered', {
    state: WorkflowState.FAILED,
    failedStep: params.failedStep,
    reason: params.reason,
    error: params.error,
  });

  await alertOps(
    `Request workflow ${workflow.id} for request ${workflow.requestId} (${
      workflow.payload?.clientId || 'unknown client'
    }) ` +
      `failed at step ${params.failedStep || 'unknown'} and requires manual intervention. ` +
      `Reason: ${params.reason}. Correlation id: ${workflow.correlationId}.`,
  );

  // A queued resubmit is the operator's retry path, so it runs even though this workflow failed.
  await startQueuedWorkflow(workflow, log);
};

interface PhaseResult {
  /** Set when the workflow yielded the worker and will be retried later. */
  retryScheduled?: boolean;
  done?: boolean;
}

const runNextStep = async (
  workflow: WorkflowRecord,
  steps: WorkflowStepRecord[],
  definitions: Map<string, WorkflowStepDefinition>,
  log: WorkflowLogger,
): Promise<PhaseResult> => {
  // A delete can supersede us between steps; never start another one on a workflow we no longer own.
  const liveState = await getWorkflowState(workflow.id);
  if (!liveState || !CLAIMABLE_WORKFLOW_STATES.includes(liveState)) {
    workflow.state = liveState ?? WorkflowState.SUPERSEDED;
    log.warn('workflow is no longer active, abandoning', { state: workflow.state });
    await releaseWorkflow(workflow.id);
    return { done: true };
  }

  const step = steps.find((candidate) => !FINISHED_STEP_STATES.has(candidate.state));

  if (!step) {
    await completeWorkflow(workflow, log);
    return { done: true };
  }

  const definition = definitions.get(step.name);
  if (!definition) {
    // The persisted plan no longer matches the code. Never guess - fail loudly and dead-letter.
    const reason = `unknown step "${step.name}" in persisted workflow plan`;
    await failWorkflow(workflow, log, { failedStep: step.name, reason, error: reason });
    return { done: true };
  }

  const attempt = step.attempts + 1;
  const stepLog = log.child({ step: step.name, attempt });
  const startedAt = Date.now();

  await updateStep(step.id, { state: StepState.RUNNING, attempts: attempt, startedAt: new Date() });
  await updateWorkflow(workflow.id, { currentStep: step.name });
  workflow.currentStep = step.name;
  stepLog.info('step started', { state: StepState.RUNNING });

  try {
    const result = await withHeartbeat(workflow.id, () =>
      withTimeout(
        definition.execute({ workflow, step: { ...step, attempts: attempt }, log: stepLog }),
        STEP_TIMEOUT_MS,
        step.name,
      ),
    );

    await updateStep(step.id, {
      state: StepState.COMPLETED,
      result: result ?? null,
      completedAt: new Date(),
      lastError: null,
    });

    stepLog.info('step completed', { state: StepState.COMPLETED });
    stepLog.metric('workflow.step.duration', Date.now() - startedAt, { step: step.name });
    return {};
  } catch (err) {
    const message = errorMessage(err);
    const permanent = isPermanentError(err);
    const exhausted = attempt >= MAX_STEP_ATTEMPTS;

    await updateStep(step.id, { state: StepState.FAILED, lastError: message });
    stepLog.error('step failed', { state: StepState.FAILED, error: message, permanent, exhausted });

    if (permanent || exhausted) {
      if (definition.optional) {
        // The integration is already applied at this point; losing a notification must not undo that.
        await updateStep(step.id, { state: StepState.SKIPPED, lastError: message, completedAt: new Date() });
        stepLog.error('optional step gave up, continuing workflow', { state: StepState.SKIPPED, error: message });

        await alertOps(
          `Request workflow ${workflow.id} for request ${workflow.requestId} (${
            workflow.payload?.clientId || 'unknown client'
          }) ` +
            `could not complete the optional step ${step.name} and skipped it: ${message}. ` +
            `The integration itself was applied. Correlation id: ${workflow.correlationId}.`,
        );

        return {};
      }

      await failWorkflow(workflow, log, {
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
    await releaseWorkflow(workflow.id, { runAfter, lastError: message });
    stepLog.warn('step retry scheduled', { delayMs, runAfter });
    scheduleInProcessRetry(workflow.id, delayMs);
    return { retryScheduled: true };
  }
};

/**
 * Drives a claimed workflow until it either finishes, yields for a scheduled retry, or exhausts the
 * per-invocation iteration budget (which simply leaves it claimable for the next tick).
 */
const execute = async (claimed: WorkflowRecord): Promise<WorkflowState> => {
  const workflow = claimed;
  const log = workflowLoggerFor(workflow);
  const definitions = stepDefinitionsByName(workflow);

  if (workflow.state === WorkflowState.PENDING) {
    workflow.state = WorkflowState.RUNNING;
    await updateWorkflow(workflow.id, { state: WorkflowState.RUNNING, startedAt: workflow.startedAt || new Date() });
    log.info('workflow started', { state: WorkflowState.RUNNING });
  }

  const steps = await getWorkflowSteps(workflow.id);
  const maxIterations = steps.length + 1;

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    const current = await getWorkflowSteps(workflow.id);
    const result = await runNextStep(workflow, current, definitions, log);

    if (result.retryScheduled) return workflow.state;
    if (result.done) return workflow.state;
  }

  log.warn('workflow iteration budget exhausted, releasing for the next tick', { state: workflow.state });
  await releaseWorkflow(workflow.id);
  return workflow.state;
};

/** Claims a specific workflow and runs it. Returns null when another worker already owns it. */
export const runWorkflow = async (workflowId: string): Promise<WorkflowState | null> => {
  const workflow = await claimWorkflow(workflowId);
  if (!workflow) return null;

  try {
    return await execute(workflow);
  } catch (err) {
    // Unexpected orchestrator error: drop the claim so the recovery tick can retry rather than
    // leaving the workflow wedged behind a stale lease.
    console.error('workflow orchestration error', err);
    await releaseWorkflow(workflowId, { lastError: errorMessage(err) });
    return null;
  }
};

/**
 * Recovery entry point used by the cron tick. Picks up anything runnable: brand new workflows whose
 * originating pod died before starting them, workflows waiting on a backoff window, workflows whose
 * lease expired mid-flight, and queued follow-ups orphaned by a pod that died before promoting them.
 */
export const drainWorkflows = async (maxWorkflows: number = 25): Promise<{ processed: number }> => {
  let processed = 0;

  const promoted = await promoteOrphanedQueuedWorkflows(maxWorkflows);
  if (promoted.length > 0) console.info(`promoted ${promoted.length} orphaned queued workflow(s)`);

  for (let i = 0; i < maxWorkflows; i += 1) {
    const workflow = await claimWorkflow();
    if (!workflow) break;

    processed += 1;

    try {
      await execute(workflow);
    } catch (err) {
      console.error('workflow orchestration error', err);
      await releaseWorkflow(workflow.id, { lastError: errorMessage(err) });
    }
  }

  if (processed > 0) console.info(`integration workflow tick processed ${processed} workflow(s)`);
  return { processed };
};
