import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import {
  ACTIVE_WORKFLOW_STATES,
  CLAIMABLE_WORKFLOW_STATES,
  IntegrationBusyError,
  WorkflowContext,
  WorkflowRecord,
  WorkflowState,
  WorkflowStepDefinition,
  WorkflowStepRecord,
  WorkflowType,
  StepState,
} from './types';
import { CLAIM_LEASE_SECONDS } from './backoff';

export const WORKER_ID = `${os.hostname()}:${process.pid}`;

const toPlain = <T>(row: any): T | null => (row ? (row.get({ plain: true }) as T) : null);

export interface CreateWorkflowParams {
  requestId: number;
  type: WorkflowType;
  action: string;
  payload: IntegrationData;
  context: WorkflowContext;
  steps: WorkflowStepDefinition[];
  correlationId?: string;
}

const writeStepPlan = async (requestWorkflowId: string, steps: WorkflowStepDefinition[], transaction: Transaction) => {
  await models.requestWorkflowStep.bulkCreate(
    steps.map((step, index) => ({
      id: randomUUID(),
      requestWorkflowId,
      name: step.name,
      label: step.label,
      sequence: index,
      state: StepState.PENDING,
    })),
    { transaction },
  );
};

/**
 * Persists the workflow and its full step plan in a single transaction. Nothing is executed here, so a
 * crash between this call and the first step simply leaves a PENDING workflow for the cron tick to pick up.
 *
 * Given the caller's `transaction`, the workflow commits with the caller's own writes (the integration
 * row and its `requested` audit event) or not at all; nothing runs until the caller has committed.
 *
 * Concurrency: an integration has at most one active workflow. A submission that arrives while one is
 * queued, pending or running is refused with `IntegrationBusyError`, which rolls back the caller's
 * transaction; the user retries once the workflow has finished.
 */
export const createWorkflow = async (
  params: CreateWorkflowParams,
  transaction?: Transaction,
): Promise<WorkflowRecord> => {
  const { requestId, type, action, payload, context, steps } = params;

  const insert = async (tx: Transaction): Promise<WorkflowRecord> => {
    const active = await models.requestWorkflow.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } },
      attributes: ['id'],
      transaction: tx,
      lock: tx.LOCK.UPDATE,
    });
    if (active) throw new IntegrationBusyError();

    const workflow = await models.requestWorkflow.create(
      {
        id: randomUUID(),
        state: WorkflowState.PENDING,
        correlationId: params.correlationId || randomUUID(),
        requestId,
        type,
        action,
        payload,
        context,
        lastError: null,
        runAfter: new Date(),
      },
      { transaction: tx },
    );

    await writeStepPlan(workflow.id, steps, tx);
    return toPlain<WorkflowRecord>(workflow)!;
  };

  try {
    return await sequelize.transaction(transaction ? { transaction } : {}, insert);
  } catch (err) {
    // Row locks cannot block an insert of a row that does not exist yet, so two first submissions can
    // both see no workflow. The one-claimable-workflow index lets only one of them insert.
    if (err instanceof UniqueConstraintError) throw new IntegrationBusyError();
    throw err;
  }
};

/**
 * New submissions are never queued any more; this only starts a QUEUED follow-up left over from before
 * concurrent submissions were refused. The guard keeps the promotion from colliding with the
 * one-active-workflow index if another workflow already took over.
 */
export const promoteQueuedWorkflow = async (requestId: number): Promise<string | null> => {
  const [rows]: any = await sequelize.query(
    `UPDATE request_workflows
        SET state = 'PENDING', run_after = NOW(), updated_at = NOW()
      WHERE request_id = :requestId
        AND state = 'QUEUED'
        AND NOT EXISTS (
          SELECT 1 FROM request_workflows active
           WHERE active.request_id = :requestId
             AND active.state IN ('PENDING', 'RUNNING')
        )
      RETURNING id`,
    { replacements: { requestId } },
  );

  return rows?.[0]?.id ?? null;
};

/** Recovery for a leftover QUEUED follow-up whose predecessor ended without promoting it. */
export const promoteOrphanedQueuedWorkflows = async (limit: number = 25): Promise<string[]> => {
  const [rows]: any = await sequelize.query(
    `UPDATE request_workflows
        SET state = 'PENDING', run_after = NOW(), updated_at = NOW()
      WHERE id IN (
        SELECT queued.id
          FROM request_workflows queued
         WHERE queued.state = 'QUEUED'
           AND NOT EXISTS (
             SELECT 1 FROM request_workflows active
              WHERE active.request_id = queued.request_id
                AND active.state IN ('PENDING', 'RUNNING')
           )
         ORDER BY queued.created_at ASC
         LIMIT :limit
      )
      RETURNING id`,
    { replacements: { limit } },
  );

  return (rows || []).map((row: any) => row.id);
};

const claimQuery = `
  WITH claimable AS (
    SELECT id
    FROM request_workflows
    WHERE state IN ('PENDING', 'RUNNING')
      AND run_after <= NOW()
      AND (claimed_at IS NULL OR claimed_at < NOW() - (:leaseSeconds * INTERVAL '1 second'))
      AND (CAST(:requestWorkflowId AS uuid) IS NULL OR id = CAST(:requestWorkflowId AS uuid))
    ORDER BY run_after ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  UPDATE request_workflows s
  SET claimed_by = :workerId, claimed_at = NOW(), updated_at = NOW()
  FROM claimable c
  WHERE s.id = c.id
  RETURNING s.id
`;

/**
 * Atomically leases one runnable workflow to this worker.
 *
 * `FOR UPDATE SKIP LOCKED` guarantees that two pods racing for work never pick the same workflow, and
 * the lease window means a workflow abandoned by a crashed pod becomes claimable again automatically.
 */
export const claimWorkflow = async (requestWorkflowId: string | null = null): Promise<WorkflowRecord | null> => {
  const [rows]: any = await sequelize.query(claimQuery, {
    replacements: { workerId: WORKER_ID, leaseSeconds: CLAIM_LEASE_SECONDS, requestWorkflowId },
  });

  const claimedId = rows?.[0]?.id;
  if (!claimedId) return null;

  return getWorkflow(claimedId);
};

export const getWorkflow = async (requestWorkflowId: string): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(await models.requestWorkflow.findOne({ where: { id: requestWorkflowId } }));

export const getWorkflowSteps = async (
  requestWorkflowId: string,
  transaction?: Transaction,
): Promise<WorkflowStepRecord[]> => {
  const steps = await models.requestWorkflowStep.findAll({
    where: { requestWorkflowId },
    order: [['sequence', 'ASC']],
    transaction,
  });

  return steps.map((step: any) => toPlain<WorkflowStepRecord>(step)!);
};

/** Running work outranks a queued follow-up, so the dashboard shows what is actually happening now. */
const workflowPriorityOrder: any = [
  sequelize.literal(`CASE state WHEN 'RUNNING' THEN 0 WHEN 'PENDING' THEN 1 WHEN 'QUEUED' THEN 2 ELSE 3 END`),
  'ASC',
];

export const getActiveWorkflowForRequest = async (
  requestId: number,
  transaction?: Transaction,
): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } },
      order: [workflowPriorityOrder],
      transaction,
    }),
  );

export const getLatestWorkflowForRequest = async (requestId: number): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({
      where: { requestId },
      order: [workflowPriorityOrder, ['createdAt', 'DESC']],
    }),
  );

/** The integration's most recent workflow, locked so its SDX step state cannot change under the caller. */
export const getWorkflowForResubmission = async (
  requestId: number,
  transaction: Transaction,
): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({
      where: { requestId },
      order: [['createdAt', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
  );

export const getLatestSdxWorkflowForRequest = async (
  requestId: number,
  transaction: Transaction,
): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({
      where: {
        requestId,
        state: { [Op.ne]: WorkflowState.SUPERSEDED },
        [Op.and]: [sequelize.where(sequelize.literal(`"context"->>'sdx'`), { [Op.ne]: null })],
      },
      order: [['createdAt', 'DESC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    }),
  );

export const updateWorkflow = async (requestWorkflowId: string, values: Record<string, any>): Promise<void> => {
  await models.requestWorkflow.update(values, { where: { id: requestWorkflowId } });
};

/** Cheap ownership probe the orchestrator runs between steps to notice it was superseded. */
export const getWorkflowState = async (requestWorkflowId: string): Promise<WorkflowState | null> => {
  const row: any = await models.requestWorkflow.findOne({
    where: { id: requestWorkflowId },
    attributes: ['state'],
    raw: true,
  });

  return (row?.state as WorkflowState) ?? null;
};

/** Drops the lease so another worker (or the cron tick) can pick the workflow up at `runAfter`. */
export const releaseWorkflow = async (requestWorkflowId: string, values: Record<string, any> = {}): Promise<void> => {
  await updateWorkflow(requestWorkflowId, { claimedBy: null, claimedAt: null, ...values });
};

/**
 * Releases only while the workflow is still claimable, so a terminal transition can never overwrite the
 * SUPERSEDED row a delete wrote. Returns false when this worker lost the race.
 */
export const releaseWorkflowIfActive = async (
  requestWorkflowId: string,
  values: Record<string, any> = {},
): Promise<boolean> => {
  const [affected] = await models.requestWorkflow.update(
    { claimedBy: null, claimedAt: null, ...values },
    { where: { id: requestWorkflowId, state: { [Op.in]: CLAIMABLE_WORKFLOW_STATES } } },
  );

  return affected > 0;
};

/** Keeps a long-running step from having its lease stolen mid-flight. */
export const heartbeatWorkflow = async (requestWorkflowId: string): Promise<boolean> => {
  const [affected] = await models.requestWorkflow.update(
    { claimedAt: new Date() },
    {
      where: {
        id: requestWorkflowId,
        claimedBy: WORKER_ID,
        state: { [Op.in]: CLAIMABLE_WORKFLOW_STATES },
      },
    },
  );

  return affected > 0;
};

export const updateStep = async (stepId: string, values: Record<string, any>): Promise<void> => {
  await models.requestWorkflowStep.update(values, { where: { id: stepId } });
};

export const recordRequestWorkflowFailure = async (params: {
  workflow: WorkflowRecord;
  failedStep: string | null;
  reason: string;
  error: string;
}): Promise<void> => {
  await models.requestWorkflowFailure.create({
    id: randomUUID(),
    requestWorkflowId: params.workflow.id,
    requestId: params.workflow.requestId,
    correlationId: params.workflow.correlationId,
    failedStep: params.failedStep,
    reason: params.reason,
    error: params.error,
    payload: params.workflow.payload,
  });
};

export const countUnacknowledgedRequestWorkflowFailures = async (): Promise<number> =>
  models.requestWorkflowFailure.count({ where: { acknowledged: false } });
