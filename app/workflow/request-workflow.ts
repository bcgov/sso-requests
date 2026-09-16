import { randomUUID } from 'crypto';
import { models } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import { ACTION_TYPES, EVENTS } from '@app/shared/enums';
import { Op } from 'sequelize';
import { createWorkflowLogger } from './logger';
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
  correlationId: string;
  state: WorkflowState;
  created: boolean;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** An integration that already produced an apply outcome is an update, never a creation. */
const hasBeenApplied = async (requestId: number): Promise<boolean> => {
  const count = await models.event.count({
    where: {
      requestId,
      eventCode: { [Op.in]: [EVENTS.REQUEST_APPLY_SUCCESS, EVENTS.REQUEST_APPLY_FAILURE] },
    },
  });

  return count > 0;
};

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
  execute: async () => {
    const isRestore = workflow.type === WorkflowType.INTEGRATION_RESTORE;
    await emitWorkflowEventOnce(workflow, isRestore ? EVENTS.REQUEST_RESTORE_SUCCESS : EVENTS.REQUEST_APPLY_SUCCESS);
    await setRequestStatus(workflow.requestId, 'applied');
    return { finalized: true };
  },
 */
export const enqueueRequestWorkflow = async (
  payload: IntegrationData,
  options: EnqueueOptions = {},
): Promise<EnqueueResult> => {
  const requestId = payload.id as number;
  const correlationId = options.correlationId || randomUUID();
  const restore = options.restore === true;
  const type = resolveWorkflowType(payload, restore);
  const isCreate = type === WorkflowType.INTEGRATION_APPLY && !restore && !(await hasBeenApplied(requestId));

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
    const superseded = await supersedeActiveWorkflows(requestId, `superseded by delete workflow ${correlationId}`);
    if (superseded > 0) log.warn('superseded in-flight workflows', { superseded });
  }

  const { workflow, created } = await createWorkflow({
    requestId,
    type,
    action: resolveAction(type, isCreate),
    payload,
    context,
    correlationId,
    steps: buildIntegrationWorkflowSteps({ payload, context, type } as WorkflowRecord),
  });

  if (!created) {
    log.warn('an in-flight workflow already owns this integration, skipping duplicate submission', {
      workflowId: workflow.id,
      state: workflow.state,
    });

    // Re-drive the existing workflow rather than starting a second one. This is what makes a
    // resubmit (or a duplicate click) a safe retry instead of a double apply.
    if (backgroundExecutionEnabled()) {
      runWorkflow(workflow.id).catch((err) =>
        log.error('background workflow execution failed', { error: String(err) }),
      );
    }

    return { workflowId: workflow.id, correlationId: workflow.correlationId, state: workflow.state, created: false };
  }

  log.info('workflow enqueued', { workflowId: workflow.id, state: workflow.state, isCreate });

  if (options.awaitCompletion || workflowExecutionMode() === 'synchronous') {
    const state = await runToCompletion(workflow.id);
    return { workflowId: workflow.id, correlationId, state, created: true };
  }

  if (backgroundExecutionEnabled()) {
    // Fire and forget: the HTTP request returns now, the workflow continues in the background.
    runWorkflow(workflow.id).catch((err) => log.error('background workflow execution failed', { error: String(err) }));
  }

  return { workflowId: workflow.id, correlationId, state: workflow.state, created: true };
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
