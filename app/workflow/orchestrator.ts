import axios from 'axios';
import { systemActor, withActor } from '@sso/audit/server';
import { Op, Transaction } from 'sequelize';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { createWorkflowLogger } from './logger';
import {
  CLAIM_LEASE_SECONDS,
  IN_PROCESS_RETRY_CEILING_MS,
  MAX_STEP_ATTEMPTS,
  nextRunAfter,
  REQUIRED_STEP_ATTEMPT_LIMIT,
  SLOW_RETRY_INTERVAL_MS,
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
  repairStuckRequestStatuses,
  updateStep,
  updateWorkflow,
  WORKER_ID,
} from './store';
import { buildIntegrationWorkflowSteps } from './steps/integration';
import { recordWorkflowEvent } from './audit';
import {
  ACTIVE_WORKFLOW_STATES,
  CLAIMABLE_WORKFLOW_STATES,
  isPermanentError,
  STEP_NAMES,
  StepState,
  TransientStepError,
  WorkflowLogger,
  WorkflowNotStoppableError,
  WorkflowRecord,
  WorkflowState,
  WorkflowStepDefinition,
  WorkflowStepRecord,
} from './types';

import { logger } from '@app/utils/logger';

const moduleLog = logger.child({ module: 'request-workflow' });

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

/**
 * Set once this pod is told to stop (SIGTERM on a deploy or a scale-down). From then on it claims nothing and
 * starts no further step: a workflow it is running releases its claim as soon as the current step ends, so the
 * next tick runs it on another pod instead of waiting out the lease. Next.js closes the server on the same signal
 * and exits once in-flight requests finish; a step still running at that point is picked up when its lease expires.
 */
let stopping = false;

export const stopTakingWork = () => {
  stopping = true;
};

/** For tests: lets a test that stopped work hand it back. */
export const resumeTakingWork = () => {
  stopping = false;
};

const SHUTDOWN_HOOK = Symbol.for('sso-requests.workflow-shutdown-hook');
if (backgroundExecutionEnabled() && !(globalThis as any)[SHUTDOWN_HOOK]) {
  (globalThis as any)[SHUTDOWN_HOOK] = true;
  process.once('SIGTERM', () => {
    stopTakingWork();
    moduleLog.info('SIGTERM received, releasing workflows between steps');
  });
}

const errorMessage = (err: unknown): string => {
  if (!err) return 'unknown error';
  if (err instanceof Error) return err.message || err.name;
  return typeof err === 'string' ? err : JSON.stringify(err);
};

const setRequestStatus = async (requestId: number, status: string, transaction?: Transaction) => {
  await models.request.update({ status }, { where: { id: requestId }, transaction });
};

/**
 * Moves the workflow to FAILED and the integration out of flight together. Written apart, a crash between
 * the two left the integration `submitted` or `planned` with no workflow to finish it, so every later
 * submission was refused as busy. The request row is locked first, in the same order a submission locks
 * the request and then its workflow, so the two cannot deadlock.
 */
const releaseAsFailed = (workflow: WorkflowRecord, values: Record<string, any>, status: string): Promise<boolean> =>
  sequelize.transaction(async (transaction) => {
    await models.request.findOne({
      where: { id: workflow.requestId },
      attributes: ['id'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const won = await releaseWorkflowIfActive(workflow.id, values, transaction);
    if (won) await setRequestStatus(workflow.requestId, status, transaction);
    return won;
  });

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
      { headers: { Accept: 'application/json' }, timeout: 10_000 },
    );
  } catch (err) {
    moduleLog.error({ err }, 'failed to publish workflow ops alert');
  }
};

/** How every ops alert names the workflow it is about. */
const describeWorkflow = (workflow: WorkflowRecord) =>
  `Request workflow ${workflow.id} for request ${workflow.requestId} (${
    workflow.payload?.clientId || 'unknown client'
  })`;

const retryIntervalText = () => {
  const minutes = Math.round(SLOW_RETRY_INTERVAL_MS / 60_000);
  return minutes === 1 ? 'minute' : `${minutes} minutes`;
};

const scheduleInProcessRetry = (workflowId: string, delayMs: number) => {
  // A pod shutting down leaves the retry to the cron tick, which reaches a pod that is staying up.
  if (!backgroundExecutionEnabled() || stopping || delayMs > IN_PROCESS_RETRY_CEILING_MS) return;

  const timer = setTimeout(() => {
    runWorkflow(workflowId).catch((err) => moduleLog.error({ err }, 'workflow retry failed'));
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
  const won = await releaseAsFailed(
    workflow,
    {
      state: WorkflowState.FAILED,
      currentStep: params.failedStep,
      completedAt: new Date(),
      lastError: params.error,
    },
    failedStatusFor(params.failedStep),
  );

  // A delete superseded us; its own outcome owns the request status and the audit trail now. The delete
  // recorded this operation as superseded when it took over; this only covers a row that missed it.
  if (!won) {
    log.warn('workflow was superseded before it could fail, skipping status write and dead letter');
    await recordWorkflowEvent(workflow, { outcome: 'superseded' }, { bestEffort: true });
    return;
  }

  workflow.state = WorkflowState.FAILED;
  await recordFailure(workflow, log, params);

  await alertOps(
    `${describeWorkflow(workflow)} failed at step ${
      params.failedStep || 'unknown'
    } and requires manual intervention. ` + `Reason: ${params.reason}. Correlation id: ${workflow.correlationId}.`,
  );

  // A queued resubmit is the operator's retry path, so it runs even though this workflow failed.
  await startQueuedWorkflow(workflow, log);
};

/** What a workflow that ended FAILED leaves behind: its operation's failure outcome and a dead letter. */
const recordFailure = async (
  workflow: WorkflowRecord,
  log: WorkflowLogger,
  params: { failedStep: string | null; reason: string; error: string },
) => {
  // Best effort: the dead letter and the ops alert must go out even if the audit write cannot.
  const details = {
    failedStep: params.failedStep ?? undefined,
    reason: params.reason,
    error: { message: params.error },
  };
  if (params.failedStep === STEP_NAMES.PLAN) {
    await recordWorkflowEvent(workflow, { outcome: 'failure', step: 'request-plan', details }, { bestEffort: true });
  }
  await recordWorkflowEvent(workflow, { outcome: 'failure', details }, { bestEffort: true });

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
};

/** The integration status a workflow ended FAILED at this step leaves; one that never got past planning failed it. */
const failedStatusFor = (failedStep: string | null) =>
  !failedStep || failedStep === STEP_NAMES.PLAN ? 'planFailed' : 'applyFailed';

export interface StopWorkflowOptions {
  /** Who stopped it, as the dead letter, the failure outcome and the ops alert name them. */
  stoppedBy: string;
  /** Runs in the transaction that stops the workflow, with the integration's status before and after. */
  onStopped?: (transaction: Transaction, change: { before: string | null; after: string }) => Promise<void>;
}

/**
 * An administrator's way out of a workflow that will never finish on its own, such as one retrying a failure
 * only a fix can clear. The workflow ends FAILED and the integration `planFailed` or `applyFailed`, exactly as
 * if the step had failed for good, so the owner can resubmit or delete it once the cause is fixed. Work already
 * applied stays applied.
 *
 * A worker still running one of its steps is not interrupted: the step finishes, the worker sees the workflow
 * is no longer active and leaves it, and FINALIZE refuses to mark it applied. A workflow whose FINALIZE has
 * already recorded success is refused, since it has applied everything and completes on its own.
 */
export const stopWorkflow = async (requestId: number, options: StopWorkflowOptions): Promise<WorkflowRecord> => {
  const reason = `stopped by ${options.stoppedBy}`;

  const stopped = await sequelize.transaction(async (transaction) => {
    // Request row first, then the workflow: the order submissions, FINALIZE and failures all lock in.
    const request: any = await models.request.findOne({
      where: { id: requestId },
      attributes: ['id', 'status'],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    const active = await models.requestWorkflow.findAll({
      where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } },
      order: [['createdAt', 'ASC']],
      lock: transaction.LOCK.UPDATE,
      transaction,
    });
    if (!request || active.length === 0) {
      throw new WorkflowNotStoppableError('This integration has no workflow in progress.');
    }

    const workflows: WorkflowRecord[] = active.map((row: any) => row.get({ plain: true }));
    const finished = await models.event.count({
      where: {
        operationId: { [Op.in]: workflows.map((workflow) => workflow.correlationId) },
        eventCode: { [Op.ne]: 'request-plan' },
        outcome: 'success',
      },
      transaction,
    });
    if (finished > 0) {
      throw new WorkflowNotStoppableError('This integration has finished applying and completes on its own.');
    }

    const completedAt = new Date();
    await models.requestWorkflow.update(
      { state: WorkflowState.FAILED, completedAt, lastError: reason, claimedBy: null, claimedAt: null },
      { where: { id: { [Op.in]: workflows.map((workflow) => workflow.id) } }, transaction },
    );

    // The newest one is what the integration is waiting on; a leftover QUEUED follow-up is stopped with it.
    const current = workflows[workflows.length - 1];
    const after = failedStatusFor(current.currentStep);
    await setRequestStatus(requestId, after, transaction);
    await options.onStopped?.(transaction, { before: request.status ?? null, after });

    return workflows.map((workflow) => ({ ...workflow, state: WorkflowState.FAILED, completedAt, lastError: reason }));
  });

  await Promise.all(
    stopped.map(async (workflow) => {
      const failedStep = workflow.currentStep || STEP_NAMES.PLAN;
      await recordFailure(workflow, workflowLoggerFor(workflow), { failedStep, reason, error: reason });
      await alertOps(
        `${describeWorkflow(workflow)} was ${reason} at step ${failedStep}. Correlation id: ${workflow.correlationId}.`,
      );
    }),
  );

  return stopped[stopped.length - 1];
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
    if (workflow.state === WorkflowState.SUPERSEDED) {
      await recordWorkflowEvent(workflow, { outcome: 'superseded' }, { bestEffort: true });
    }
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
    if (attempt > MAX_STEP_ATTEMPTS) stepLog.warn('step recovered after repeated failures', { attempts: attempt });
    return {};
  } catch (err) {
    return handleStepFailure({ workflow, step, definition, attempt, log, stepLog }, err);
  }
};

interface FailedAttempt {
  workflow: WorkflowRecord;
  step: WorkflowStepRecord;
  definition: WorkflowStepDefinition;
  attempt: number;
  log: WorkflowLogger;
  stepLog: WorkflowLogger;
}

/** Decides what a failed attempt leads to: a skipped optional step, a failed workflow, or another retry. */
const handleStepFailure = async (failed: FailedAttempt, err: unknown): Promise<PhaseResult> => {
  const { workflow, step, definition, attempt, log, stepLog } = failed;
  const message = errorMessage(err);
  const permanent = isPermanentError(err);
  // A required step outlasts an outage instead of failing the workflow, unless a hard cap is configured.
  const exhausted = definition.optional
    ? attempt >= MAX_STEP_ATTEMPTS
    : REQUIRED_STEP_ATTEMPT_LIMIT > 0 && attempt >= REQUIRED_STEP_ATTEMPT_LIMIT;

  await updateStep(step.id, { state: StepState.FAILED, lastError: message });
  stepLog.error('step failed', { state: StepState.FAILED, error: message, permanent, exhausted });

  if ((permanent || exhausted) && definition.optional) {
    // Keycloak is already applied at this point; losing a notification must not undo that.
    await updateStep(step.id, { state: StepState.SKIPPED, lastError: message, completedAt: new Date() });
    stepLog.error('optional step gave up, continuing workflow', { state: StepState.SKIPPED, error: message });
    await alertOps(
      `${describeWorkflow(workflow)} could not complete the optional step ${step.name} and skipped it: ${message}. ` +
        `The integration itself was applied. Correlation id: ${workflow.correlationId}.`,
    );
    return {};
  }

  if (permanent || exhausted) {
    await failWorkflow(workflow, log, {
      failedStep: step.name,
      reason: permanent
        ? `step ${step.name} was rejected and cannot succeed on retry: ${message}`
        : `step ${step.name} reached the configured attempt limit: ${message}`,
      error: message,
    });
    return { done: true };
  }

  // Once, as the step moves to slow retries, so a long outage raises one alert per workflow, not per attempt.
  if (!definition.optional && attempt === MAX_STEP_ATTEMPTS) {
    await alertOps(
      `${describeWorkflow(workflow)} has failed step ${step.name} ${attempt} times and keeps retrying: ${message}. ` +
        `It is retried every ${retryIntervalText()} and completes on its own once the dependency recovers. ` +
        `Correlation id: ${workflow.correlationId}.`,
    );
  }

  // Steps that already completed stay completed; the retry picks up right here. Only while the workflow is still
  // active, so an administrator's stop that landed during the attempt keeps its own outcome and reason.
  const { runAfter, delayMs } = nextRunAfter(attempt);
  if (!(await releaseWorkflowIfActive(workflow.id, { runAfter, lastError: message }))) {
    stepLog.warn('workflow was stopped during the attempt, not retrying');
    return { done: true };
  }
  stepLog.warn('step retry scheduled', { delayMs, runAfter });
  scheduleInProcessRetry(workflow.id, delayMs);
  return { retryScheduled: true };
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
    if (stopping) {
      await releaseWorkflow(workflow.id);
      log.info('pod is shutting down, released the workflow between steps', { state: workflow.state });
      return workflow.state;
    }

    const current = await getWorkflowSteps(workflow.id);
    const result = await runNextStep(workflow, current, definitions, log);

    if (result.retryScheduled) return workflow.state;
    if (result.done) return workflow.state;
  }

  log.warn('workflow iteration budget exhausted, releasing for the next tick', { state: workflow.state });
  await releaseWorkflow(workflow.id);
  return workflow.state;
};

/**
 * Every run of the engine — first run, background run, retry, recovery tick — is attributed to the
 * engine, never to whoever's request happened to start it. That person is the actor on the operation's
 * `requested` row.
 */
const asEngine = <T>(fn: () => Promise<T>): Promise<T> => withActor(systemActor('workflow-engine'), fn);

/** Claims a specific workflow and runs it. Returns null when another worker already owns it. */
export const runWorkflow = (workflowId: string): Promise<WorkflowState | null> =>
  asEngine(() => runClaimedWorkflow(workflowId));

const runClaimedWorkflow = async (workflowId: string): Promise<WorkflowState | null> => {
  if (stopping) return null;
  const workflow = await claimWorkflow(workflowId);
  if (!workflow) return null;

  try {
    return await execute(workflow);
  } catch (err) {
    // Unexpected orchestrator error: drop the claim so the recovery tick can retry rather than
    // leaving the workflow wedged behind a stale lease.
    moduleLog.error({ err }, 'workflow orchestration error');
    await releaseWorkflow(workflowId, { lastError: errorMessage(err) });
    return null;
  }
};

/**
 * Recovery entry point used by the cron tick. Picks up anything runnable: brand new workflows whose
 * originating pod died before starting them, workflows waiting on a backoff window, workflows whose
 * lease expired mid-flight, and queued follow-ups orphaned by a pod that died before promoting them.
 */
export const drainWorkflows = (maxWorkflows: number = 25): Promise<{ processed: number }> =>
  asEngine(() => drainClaimableWorkflows(maxWorkflows));

const drainClaimableWorkflows = async (maxWorkflows: number): Promise<{ processed: number }> => {
  let processed = 0;

  const repaired = await repairStuckRequestStatuses(maxWorkflows);
  for (const row of repaired) {
    moduleLog.warn(
      { requestId: row.id, status: row.status },
      'repaired an integration left in flight by an ended workflow',
    );
  }

  const promoted = await promoteOrphanedQueuedWorkflows(maxWorkflows);
  if (promoted.length > 0) moduleLog.info({ promoted: promoted.length }, 'promoted orphaned queued workflows');

  for (let i = 0; i < maxWorkflows && !stopping; i += 1) {
    const workflow = await claimWorkflow();
    if (!workflow) break;

    processed += 1;

    try {
      await execute(workflow);
    } catch (err) {
      moduleLog.error({ err }, 'workflow orchestration error');
      await releaseWorkflow(workflow.id, { lastError: errorMessage(err) });
    }
  }

  if (processed > 0) moduleLog.info({ processed }, 'integration workflow tick processed workflows');
  return { processed };
};
