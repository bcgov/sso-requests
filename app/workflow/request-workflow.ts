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
import { createWorkflow, getLatestWorkflowForRequest, getWorkflow, getWorkflowSteps } from './store';

const MAX_SYNCHRONOUS_ITERATIONS = 100;
const SYNCHRONOUS_WAIT_CEILING_MS = 5_000;
/** How often a caller waiting on a workflow another worker holds (the pod's own retry timer) checks on it. */
const CLAIMED_POLL_MS = 500;

/**
 * How long a caller that awaits its workflow (API account create, delete and restore) waits for it. Well under
 * the route's 180s timeout. Once the next retry falls beyond it, the dependency is having an outage rather than
 * a blip: the caller gets the workflow as still in progress, and it finishes on its own.
 */
export const AWAIT_COMPLETION_BUDGET_MS = Number(process.env.WORKFLOW_AWAIT_COMPLETION_BUDGET_MS || 45_000);

export interface EnqueueOptions {
  restore?: boolean;
  existingClientId?: string;
  addingProd?: boolean;
  correlationId?: string;
  sdx?: WorkflowContext['sdx'];
}

export interface ExecuteOptions {
  /** Block until the workflow reaches a terminal state. Used by flows whose caller needs the Keycloak
   * client to exist before it returns (team API service accounts). */
  awaitCompletion?: boolean;
}

export interface EnqueueResult {
  workflowId: string;
  correlationId: string;
  state: WorkflowState;
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

/**
 * Runs the workflow until it ends, or until waiting any longer would outlast `AWAIT_COMPLETION_BUDGET_MS`. Returns
 * the state it reached: PENDING or RUNNING means it is still retrying and carries on in the background.
 */
const runToCompletion = async (workflowId: string): Promise<WorkflowState> => {
  const deadline = Date.now() + AWAIT_COMPLETION_BUDGET_MS;
  let state = WorkflowState.RUNNING;

  for (let iteration = 0; iteration < MAX_SYNCHRONOUS_ITERATIONS; iteration += 1) {
    const ran = await runWorkflow(workflowId);

    const workflow = await getWorkflow(workflowId);
    if (!workflow) return WorkflowState.FAILED;
    state = workflow.state;
    if (TERMINAL_WORKFLOW_STATES.includes(state)) return state;

    // Another worker holds it: check back shortly rather than spin.
    const untilNextRun = new Date(workflow.runAfter).getTime() - Date.now();
    const waitMs = ran === null ? Math.max(untilNextRun, CLAIMED_POLL_MS) : untilNextRun;
    if (Date.now() + Math.max(waitMs, 0) > deadline) return state;
    if (waitMs > 0) await sleep(Math.min(waitMs, SYNCHRONOUS_WAIT_CEILING_MS));
  }

  return state;
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
    sdx: options.sdx,
  };

  const log = createWorkflowLogger({ correlationId, requestId, workflowType: type });

  // Throws IntegrationBusyError while another workflow for this integration is active.
  const workflow = await createWorkflow(
    {
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

  log.info('workflow enqueued', { workflowId: workflow.id, state: workflow.state, isCreate });
  return { workflowId: workflow.id, correlationId: workflow.correlationId, state: workflow.state, auditAction };
};

/**
 * Runs a workflow enqueued by `enqueueRequestWorkflow`, after the transaction that enqueued it has
 * committed: to completion when the caller awaits it (or in synchronous mode), otherwise in the
 * background.
 */
export const executeEnqueuedWorkflow = async <T extends EnqueueResult>(
  enqueued: T,
  options: ExecuteOptions = {},
): Promise<T> => {
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
