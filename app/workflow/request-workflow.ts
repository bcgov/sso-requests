import { randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { WorkflowAction } from '@sso/audit';
import { IntegrationData } from '@app/shared/interfaces';
import { ACTION_TYPES } from '@app/shared/enums';
import { createWorkflowLogger } from './logger';
import { auditActionFor, countApplyOutcomes } from './audit';
import { buildIntegrationWorkflowSteps } from './steps/integration';
import { backgroundExecutionEnabled, runWorkflow, workflowExecutionMode } from './orchestrator';
import {
  ACTIVE_WORKFLOW_STATES,
  WorkflowContext,
  WorkflowRecord,
  WorkflowState,
  WorkflowType,
  StepState,
  TERMINAL_WORKFLOW_STATES,
} from './types';
import {
  createWorkflow,
  getLatestWorkflowForRequest,
  getWorkflow,
  getWorkflowSteps,
  supersedeActiveWorkflows,
} from './store';

const MAX_SYNCHRONOUS_ITERATIONS = 30;
const SYNCHRONOUS_WAIT_CEILING_MS = 5_000;

export interface EnqueueOptions {
  restore?: boolean;
  existingClientId?: string;
  addingProd?: boolean;
  /** Block until the workflow reaches a terminal state. Used by flows whose caller needs the Keycloak
   * client to exist before it returns (team API service accounts). */
  awaitCompletion?: boolean;
  correlationId?: string;
}

export interface EnqueueResult {
  workflowId: string;
  /** The workflow's correlation id. Differs from the submission's own only when it adopted another pod's. */
  correlationId: string;
  state: WorkflowState;
  created: boolean;
  /** True when an in-flight workflow owned the integration and this submission was parked behind it. */
  queued: boolean;
  /** The audit action of this submission, the same one the engine records its outcome under. */
  auditAction: WorkflowAction;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An integration that already produced an apply outcome is an update, never a creation. */
const hasBeenApplied = async (requestId: number, transaction?: Transaction): Promise<boolean> =>
  (await countApplyOutcomes(requestId, { transaction })) > 0;

const resolveWorkflowType = (payload: IntegrationData, restore: boolean): WorkflowType => {
  if (payload.archived) return WorkflowType.INTEGRATION_DELETE;
  if (restore) return WorkflowType.INTEGRATION_RESTORE;
  return WorkflowType.INTEGRATION_APPLY;
};

const resolveAction = (type: WorkflowType, isCreate: boolean): string => {
  if (type === WorkflowType.INTEGRATION_DELETE) return ACTION_TYPES.DELETE;
  return isCreate ? ACTION_TYPES.CREATE : ACTION_TYPES.UPDATE;
};

const runToCompletion = async (workflowId: string): Promise<WorkflowState> => {
  for (let iteration = 0; iteration < MAX_SYNCHRONOUS_ITERATIONS; iteration += 1) {
    await runWorkflow(workflowId);

    const workflow = await getWorkflow(workflowId);
    if (!workflow) return WorkflowState.FAILED;
    if (TERMINAL_WORKFLOW_STATES.includes(workflow.state)) return workflow.state;

    const waitMs = new Date(workflow.runAfter).getTime() - Date.now();
    if (waitMs > 0) await sleep(Math.min(waitMs, SYNCHRONOUS_WAIT_CEILING_MS));
  }

  return WorkflowState.RUNNING;
};

/**
 * Persists a workflow for the integration and nothing else: no Keycloak call, no execution. Pass the
 * caller's transaction so the workflow commits with the change that asked for it, and run it with
 * `executeEnqueuedWorkflow` only once that transaction has committed.
 */
export const enqueueRequestWorkflow = async (
  payload: IntegrationData,
  options: EnqueueOptions = {},
  transaction?: Transaction,
): Promise<EnqueueResult> => {
  const requestId = payload.id as number;
  const id = randomUUID();
  const correlationId = options.correlationId || randomUUID();
  const restore = options.restore === true;
  const type = resolveWorkflowType(payload, restore);
  const isCreate =
    type === WorkflowType.INTEGRATION_APPLY && !restore && !(await hasBeenApplied(requestId, transaction));
  const action = resolveAction(type, isCreate);
  const auditAction = auditActionFor({ type, action, payload });

  const context: WorkflowContext = {
    isCreate,
    restore,
    addingProd: options.addingProd === true,
    existingClientId: options.existingClientId || '',
  };

  const log = createWorkflowLogger({ correlationId, requestId, workflowType: type });

  // A delete must win over an in-flight update, otherwise the older snapshot would be re-applied
  // and resurrect the integration. Superseding moves the loser to a terminal state immediately.
  if (type === WorkflowType.INTEGRATION_DELETE) {
    const superseded = await supersedeActiveWorkflows(
      requestId,
      { workflowId: id, operationId: correlationId },
      transaction,
    );
    if (superseded > 0) log.warn('superseded in-flight workflows', { superseded });
  }

  const { workflow, created, queued } = await createWorkflow(
    {
      id,
      requestId,
      type,
      action,
      payload,
      context,
      correlationId,
      steps: buildIntegrationWorkflowSteps({ payload, context, type } as WorkflowRecord),
    },
    transaction,
  );

  const result = { workflowId: workflow.id, correlationId: workflow.correlationId, state: workflow.state, auditAction };

  if (queued) {
    // The caller needs the Keycloak client to exist on return, and a queued workflow cannot promise that.
    // Thrown inside the caller's transaction, so the parked submission is rolled back with everything else.
    if (options.awaitCompletion) {
      throw new Error(`cannot await integration ${requestId}: another workflow is still in flight`);
    }

    log.info('an in-flight workflow owns this integration, submission queued behind it', {
      workflowId: workflow.id,
      state: workflow.state,
    });

    return { ...result, created, queued: true };
  }

  if (!created) {
    log.warn('a concurrent submission won the race, adopting its workflow', {
      workflowId: workflow.id,
      state: workflow.state,
    });

    return { ...result, created: false, queued: false };
  }

  log.info('workflow enqueued', { workflowId: workflow.id, state: workflow.state, isCreate });
  return { ...result, created: true, queued: false };
};

/**
 * Runs a workflow enqueued by `enqueueRequestWorkflow`, after the transaction that enqueued it has
 * committed: to completion when the caller awaits it (or in synchronous mode), otherwise in the
 * background. A queued or adopted workflow is left to whoever owns it.
 */
export const executeEnqueuedWorkflow = async <T extends EnqueueResult>(
  enqueued: T,
  options: Pick<EnqueueOptions, 'awaitCompletion'> = {},
): Promise<T> => {
  if (enqueued.queued || !enqueued.created) return enqueued;

  if (options.awaitCompletion || workflowExecutionMode() === 'synchronous') {
    const state = await runToCompletion(enqueued.workflowId);
    return { ...enqueued, state };
  }

  if (backgroundExecutionEnabled()) {
    // Fire and forget: the HTTP request returns now, the workflow continues in the background.
    const log = createWorkflowLogger({ correlationId: enqueued.correlationId, workflowId: enqueued.workflowId });
    runWorkflow(enqueued.workflowId).catch((err) =>
      log.error('background workflow execution failed', { error: String(err) }),
    );
  }

  return enqueued;
};

export interface RequestWorkflowProgressStep {
  name: string;
  label: string;
  state: StepState;
  attempts: number;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface RequestWorkflowProgress {
  requestWorkflowId: string;
  correlationId: string;
  requestId: number;
  type: WorkflowType;
  action: string;
  state: WorkflowState;
  active: boolean;
  failedStep: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  steps: RequestWorkflowProgressStep[];
}

/**
 * Progress projection consumed by the dashboard. Returns the most recent workflow for the integration;
 * the UI keeps the progress tab visible while `active` is true or the workflow ended in FAILED.
 */
export const getIntegrationProgress = async (requestId: number): Promise<RequestWorkflowProgress | null> => {
  const workflow = await getLatestWorkflowForRequest(requestId);
  if (!workflow) return null;

  const steps = await getWorkflowSteps(workflow.id);
  const failedStep = steps.find((step) => (step.state as StepState) === StepState.FAILED);

  return {
    requestWorkflowId: workflow.id,
    correlationId: workflow.correlationId,
    requestId: workflow.requestId,
    type: workflow.type,
    action: workflow.action,
    state: workflow.state,
    active: ACTIVE_WORKFLOW_STATES.includes(workflow.state),
    failedStep: failedStep?.name ?? null,
    error: workflow.lastError,
    startedAt: workflow.startedAt,
    completedAt: workflow.completedAt,
    steps: steps.map((step) => ({
      name: step.name,
      label: step.label,
      state: step.state as StepState,
      attempts: step.attempts,
      error: step.lastError,
      startedAt: step.startedAt,
      completedAt: step.completedAt,
    })),
  };
};
