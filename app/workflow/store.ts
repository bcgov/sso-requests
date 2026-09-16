import os from 'os';
import { randomUUID } from 'crypto';
import { Op } from 'sequelize';
import { models, sequelize } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import {
  ACTIVE_WORKFLOW_STATES,
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

export interface CreateWorkflowResult {
  workflow: WorkflowRecord;
  /** False when an in-flight workflow already owned this integration and was returned instead. */
  created: boolean;
}

/**
 * Persists the workflow and its full step plan in a single transaction. Nothing is executed here, so a
 * crash between this call and the first step simply leaves a PENDING workflow for the cron tick to pick up.
 *
 * De-duplication: a partial unique index allows only one active workflow per integration. A concurrent
 * duplicate submit therefore loses the race and gets the existing workflow back instead of a second workflow.
 */
export const createWorkflow = async (params: CreateWorkflowParams): Promise<CreateWorkflowResult> => {
  const { requestId, type, action, payload, context, steps } = params;

  return sequelize.transaction(async (transaction: any) => {
    const existing = await models.requestWorkflow.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existing) return { workflow: toPlain<WorkflowRecord>(existing)!, created: false };

    const workflow = await models.requestWorkflow.create(
      {
        id: randomUUID(),
        correlationId: params.correlationId || randomUUID(),
        requestId,
        type,
        action,
        state: WorkflowState.PENDING,
        payload,
        context,
        runAfter: new Date(),
      },
      { transaction },
    );

    await models.requestWorkflowStep.bulkCreate(
      steps.map((step, index) => ({
        id: randomUUID(),
        requestWorkflowId: workflow.id,
        name: step.name,
        label: step.label,
        sequence: index,
        state: StepState.PENDING,
      })),
      { transaction },
    );

    return { workflow: toPlain<WorkflowRecord>(workflow)!, created: true };
  });
};

/**
 * Closes out any in-flight workflow for an integration so a higher-priority workflow (a delete) can take
 * over. The superseded workflow is moved to a terminal state, never left parked in RUNNING.
 */
export const supersedeActiveWorkflows = async (requestId: number, reason: string): Promise<number> => {
  const [, affected] = await models.requestWorkflow.update(
    {
      state: WorkflowState.SUPERSEDED,
      lastError: reason,
      claimedBy: null,
      claimedAt: null,
      completedAt: new Date(),
    },
    { where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } }, returning: true },
  );

  return Array.isArray(affected) ? affected.length : Number(affected || 0);
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

export const getWorkflowSteps = async (requestWorkflowId: string): Promise<WorkflowStepRecord[]> => {
  const steps = await models.requestWorkflowStep.findAll({
    where: { requestWorkflowId },
    order: [['sequence', 'ASC']],
  });

  return steps.map((step: any) => toPlain<WorkflowStepRecord>(step)!);
};

export const getActiveWorkflowForRequest = async (requestId: number): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({
      where: { requestId, state: { [Op.in]: ACTIVE_WORKFLOW_STATES } },
    }),
  );

export const getLatestWorkflowForRequest = async (requestId: number): Promise<WorkflowRecord | null> =>
  toPlain<WorkflowRecord>(
    await models.requestWorkflow.findOne({ where: { requestId }, order: [['createdAt', 'DESC']] }),
  );

export const updateWorkflow = async (requestWorkflowId: string, values: Record<string, any>): Promise<void> => {
  await models.requestWorkflow.update(values, { where: { id: requestWorkflowId } });
};

/** Drops the lease so another worker (or the cron tick) can pick the workflow up at `runAfter`. */
export const releaseWorkflow = async (requestWorkflowId: string, values: Record<string, any> = {}): Promise<void> => {
  await updateWorkflow(requestWorkflowId, { claimedBy: null, claimedAt: null, ...values });
};

/** Keeps a long-running step from having its lease stolen mid-flight. */
export const heartbeatWorkflow = async (requestWorkflowId: string): Promise<void> => {
  await updateWorkflow(requestWorkflowId, { claimedAt: new Date() });
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
