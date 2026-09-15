import os from 'os';
import { randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import {
  ACTIVE_SAGA_STATES,
  SagaContext,
  SagaRecord,
  SagaState,
  SagaStepDefinition,
  SagaStepRecord,
  SagaType,
  StepState,
} from './types';
import { CLAIM_LEASE_SECONDS } from './backoff';

export const WORKER_ID = `${os.hostname()}:${process.pid}`;

const toPlain = <T>(row: any): T | null => (row ? (row.get({ plain: true }) as T) : null);

export interface CreateSagaParams {
  requestId: number;
  type: SagaType;
  action: string;
  payload: IntegrationData;
  context: SagaContext;
  steps: SagaStepDefinition[];
  correlationId?: string;
}

export interface CreateSagaResult {
  saga: SagaRecord;
  /** False when an in-flight saga already owned this integration and was returned instead. */
  created: boolean;
}

/**
 * Persists the saga and its full step plan in a single transaction. Nothing is executed here, so a
 * crash between this call and the first step simply leaves a PENDING saga for the cron tick to pick up.
 *
 * De-duplication: a partial unique index allows only one active saga per integration. A concurrent
 * duplicate submit therefore loses the race and gets the existing saga back instead of a second workflow.
 */
export const createSaga = async (params: CreateSagaParams): Promise<CreateSagaResult> => {
  const { requestId, type, action, payload, context, steps } = params;

  return sequelize.transaction(async (transaction: any) => {
    const existing = await models.integrationSaga.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_SAGA_STATES } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existing) return { saga: toPlain<SagaRecord>(existing)!, created: false };

    const saga = await models.integrationSaga.create(
      {
        id: randomUUID(),
        correlationId: params.correlationId || randomUUID(),
        requestId,
        type,
        action,
        state: SagaState.PENDING,
        payload,
        context,
        runAfter: new Date(),
      },
      { transaction },
    );

    await models.integrationSagaStep.bulkCreate(
      steps.map((step, index) => ({
        id: randomUUID(),
        sagaId: saga.id,
        name: step.name,
        label: step.label,
        sequence: index,
        state: StepState.PENDING,
      })),
      { transaction },
    );

    return { saga: toPlain<SagaRecord>(saga)!, created: true };
  });
};

/**
 * Closes out any in-flight saga for an integration so a higher-priority workflow (a delete) can take
 * over. The superseded saga is moved to a terminal state, never left parked in RUNNING.
 */
export const supersedeActiveSagas = async (requestId: number, reason: string): Promise<number> => {
  const [, affected] = await models.integrationSaga.update(
    {
      state: SagaState.SUPERSEDED,
      lastError: reason,
      claimedBy: null,
      claimedAt: null,
      completedAt: new Date(),
    },
    { where: { requestId, state: { [Op.in]: ACTIVE_SAGA_STATES } }, returning: true },
  );

  return Array.isArray(affected) ? affected.length : Number(affected || 0);
};

const claimQuery = `
  WITH claimable AS (
    SELECT id
    FROM integration_sagas
    WHERE state IN ('PENDING', 'RUNNING')
      AND run_after <= NOW()
      AND (claimed_at IS NULL OR claimed_at < NOW() - (:leaseSeconds * INTERVAL '1 second'))
      AND (CAST(:sagaId AS uuid) IS NULL OR id = CAST(:sagaId AS uuid))
    ORDER BY run_after ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE integration_sagas s
  SET claimed_by = :workerId, claimed_at = NOW(), updated_at = NOW()
  FROM claimable c
  WHERE s.id = c.id
  RETURNING s.id
`;

/**
 * Atomically leases one runnable saga to this worker.
 *
 * `FOR UPDATE SKIP LOCKED` guarantees that two pods racing for work never pick the same saga, and
 * the lease window means a saga abandoned by a crashed pod becomes claimable again automatically.
 */
export const claimSaga = async (sagaId: string | null = null): Promise<SagaRecord | null> => {
  const [rows]: any = await sequelize.query(claimQuery, {
    replacements: { workerId: WORKER_ID, leaseSeconds: CLAIM_LEASE_SECONDS, sagaId },
  });

  const claimedId = rows?.[0]?.id;
  if (!claimedId) return null;

  return getSaga(claimedId);
};

export const getSaga = async (sagaId: string): Promise<SagaRecord | null> =>
  toPlain<SagaRecord>(await models.integrationSaga.findOne({ where: { id: sagaId } }));

export const getSagaSteps = async (sagaId: string): Promise<SagaStepRecord[]> => {
  const steps = await models.integrationSagaStep.findAll({
    where: { sagaId },
    order: [['sequence', 'ASC']],
  });

  return steps.map((step: any) => toPlain<SagaStepRecord>(step)!);
};

export const getActiveSagaForRequest = async (requestId: number): Promise<SagaRecord | null> =>
  toPlain<SagaRecord>(
    await models.integrationSaga.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_SAGA_STATES } },
    }),
  );

export const getLatestSagaForRequest = async (requestId: number): Promise<SagaRecord | null> =>
  toPlain<SagaRecord>(await models.integrationSaga.findOne({ where: { requestId }, order: [['createdAt', 'DESC']] }));

export const updateSaga = async (sagaId: string, values: Record<string, any>): Promise<void> => {
  await models.integrationSaga.update(values, { where: { id: sagaId } });
};

/** Drops the lease so another worker (or the cron tick) can pick the saga up at `runAfter`. */
export const releaseSaga = async (sagaId: string, values: Record<string, any> = {}): Promise<void> => {
  await updateSaga(sagaId, { claimedBy: null, claimedAt: null, ...values });
};

/** Keeps a long-running step from having its lease stolen mid-flight. */
export const heartbeatSaga = async (sagaId: string): Promise<void> => {
  await updateSaga(sagaId, { claimedAt: new Date() });
};

export const updateStep = async (stepId: string, values: Record<string, any>): Promise<void> => {
  await models.integrationSagaStep.update(values, { where: { id: stepId } });
};

export const recordDeadLetter = async (params: {
  saga: SagaRecord;
  failedStep: string | null;
  reason: string;
  error: string;
}): Promise<void> => {
  await models.integrationSagaDeadLetter.create({
    id: randomUUID(),
    sagaId: params.saga.id,
    requestId: params.saga.requestId,
    correlationId: params.saga.correlationId,
    failedStep: params.failedStep,
    reason: params.reason,
    error: params.error,
    payload: params.saga.payload,
  });
};

export const countUnacknowledgedDeadLetters = async (): Promise<number> =>
  models.integrationSagaDeadLetter.count({ where: { acknowledged: false } });
