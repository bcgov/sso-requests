import { randomUUID } from 'crypto';
import { models } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import { ACTION_TYPES, EVENTS } from '@app/shared/enums';
import { Op } from 'sequelize';
import { createSagaLogger } from './logger';
import { buildIntegrationSagaSteps } from './steps/integration';
import { backgroundExecutionEnabled, runSaga, sagaExecutionMode } from './orchestrator';
import { createSaga, getLatestSagaForRequest, getSaga, getSagaSteps, supersedeActiveSagas } from './store';
import {
  ACTIVE_SAGA_STATES,
  SagaContext,
  SagaRecord,
  SagaState,
  SagaType,
  StepState,
  TERMINAL_SAGA_STATES,
} from './types';

const MAX_SYNCHRONOUS_ITERATIONS = 30;
const SYNCHRONOUS_WAIT_CEILING_MS = 5_000;

export interface EnqueueOptions {
  restore?: boolean;
  existingClientId?: string;
  addingProd?: boolean;
  /** Block until the saga reaches a terminal state. Used by flows whose caller needs the Keycloak
   * client to exist before it returns (team API service accounts). */
  awaitCompletion?: boolean;
  correlationId?: string;
}

export interface EnqueueResult {
  sagaId: string;
  correlationId: string;
  state: SagaState;
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

const resolveSagaType = (payload: IntegrationData, restore: boolean): SagaType => {
  if (payload.archived) return SagaType.INTEGRATION_DELETE;
  if (restore) return SagaType.INTEGRATION_RESTORE;
  return SagaType.INTEGRATION_APPLY;
};

const resolveAction = (type: SagaType, isCreate: boolean): string => {
  if (type === SagaType.INTEGRATION_DELETE) return ACTION_TYPES.DELETE;
  return isCreate ? ACTION_TYPES.CREATE : ACTION_TYPES.UPDATE;
};

const runToCompletion = async (sagaId: string): Promise<SagaState> => {
  for (let iteration = 0; iteration < MAX_SYNCHRONOUS_ITERATIONS; iteration += 1) {
    await runSaga(sagaId);

    const saga = await getSaga(sagaId);
    if (!saga) return SagaState.FAILED;
    if (TERMINAL_SAGA_STATES.includes(saga.state)) return saga.state;

    const waitMs = new Date(saga.runAfter).getTime() - Date.now();
    if (waitMs > 0) await sleep(Math.min(waitMs, SYNCHRONOUS_WAIT_CEILING_MS));
  }

  return SagaState.RUNNING;
};

/**
 * Entry point for every integration workflow.
 *
 * The saga and its full step plan are committed to Postgres *before* anything is executed, so the
 * caller can return immediately and the work survives a pod restart. Execution is then kicked off
 * in-process; if that pod dies mid-flight the cron recovery tick re-claims the saga from wherever
 * it stopped, because each completed step is durably recorded.
 */
export const enqueueIntegrationSaga = async (
  payload: IntegrationData,
  options: EnqueueOptions = {},
): Promise<EnqueueResult> => {
  const requestId = payload.id as number;
  const correlationId = options.correlationId || randomUUID();
  const restore = options.restore === true;
  const type = resolveSagaType(payload, restore);
  const isCreate = type === SagaType.INTEGRATION_APPLY && !restore && !(await hasBeenApplied(requestId));

  const context: SagaContext = {
    isCreate,
    restore,
    addingProd: options.addingProd === true,
    existingClientId: options.existingClientId || '',
  };

  const log = createSagaLogger({ correlationId, requestId, sagaType: type });

  // A delete must win over an in-flight update, otherwise the older snapshot would be re-applied
  // and resurrect the integration. Superseding moves the loser to a terminal state immediately.
  if (type === SagaType.INTEGRATION_DELETE) {
    const superseded = await supersedeActiveSagas(requestId, `superseded by delete saga ${correlationId}`);
    if (superseded > 0) log.warn('superseded in-flight sagas', { superseded });
  }

  const { saga, created } = await createSaga({
    requestId,
    type,
    action: resolveAction(type, isCreate),
    payload,
    context,
    correlationId,
    steps: buildIntegrationSagaSteps({ payload, context, type } as SagaRecord),
  });

  if (!created) {
    log.warn('an in-flight saga already owns this integration, skipping duplicate submission', {
      sagaId: saga.id,
      state: saga.state,
    });

    // Re-drive the existing workflow rather than starting a second one. This is what makes a
    // resubmit (or a duplicate click) a safe retry instead of a double apply.
    if (backgroundExecutionEnabled()) {
      runSaga(saga.id).catch((err) => log.error('background saga execution failed', { error: String(err) }));
    }

    return { sagaId: saga.id, correlationId: saga.correlationId, state: saga.state, created: false };
  }

  log.info('saga enqueued', { sagaId: saga.id, state: saga.state, isCreate });

  if (options.awaitCompletion || sagaExecutionMode() === 'synchronous') {
    const state = await runToCompletion(saga.id);
    return { sagaId: saga.id, correlationId, state, created: true };
  }

  if (backgroundExecutionEnabled()) {
    // Fire and forget: the HTTP request returns now, the workflow continues in the background.
    runSaga(saga.id).catch((err) => log.error('background saga execution failed', { error: String(err) }));
  }

  return { sagaId: saga.id, correlationId, state: saga.state, created: true };
};

export interface IntegrationProgressStep {
  name: string;
  label: string;
  state: StepState;
  attempts: number;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface IntegrationProgress {
  sagaId: string;
  correlationId: string;
  requestId: number;
  type: SagaType;
  action: string;
  state: SagaState;
  active: boolean;
  failedStep: string | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  steps: IntegrationProgressStep[];
}

/**
 * Progress projection consumed by the dashboard. Returns the most recent saga for the integration;
 * the UI keeps the progress tab visible while `active` is true or the saga ended in FAILED.
 */
export const getIntegrationProgress = async (requestId: number): Promise<IntegrationProgress | null> => {
  const saga = await getLatestSagaForRequest(requestId);
  if (!saga) return null;

  const steps = await getSagaSteps(saga.id);
  const failedStep = steps.find((step) => (step.state as StepState) === StepState.FAILED);

  return {
    sagaId: saga.id,
    correlationId: saga.correlationId,
    requestId: saga.requestId,
    type: saga.type,
    action: saga.action,
    state: saga.state,
    active: ACTIVE_SAGA_STATES.includes(saga.state),
    failedStep: failedStep?.name ?? null,
    error: saga.lastError,
    startedAt: saga.startedAt,
    completedAt: saga.completedAt,
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
