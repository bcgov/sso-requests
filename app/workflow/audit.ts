import { Op, Transaction } from 'sequelize';
import { AuditDetails, OutcomeDetails, Outcome, WorkflowAction, systemActor, withActor } from '@sso/audit/server';
import { models } from '@app/shared/sequelize/models/models';
import { audit } from '@app/queries/event';
import { ACTION_TYPES } from '@app/shared/enums';
import { WorkflowRecord, WorkflowType } from './types';

// How workflow-backed operations reach the audit record. The controller that
// enqueues a workflow writes its `requested` row; everything after that — the
// terminal outcome and the `request-plan` step — is the engine's, always under
// the `workflow-engine` actor and always keyed by the workflow's correlation id,
// which is the operation id.

export type WorkflowIdentity = Pick<WorkflowRecord, 'type' | 'action' | 'payload'>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TERMINAL_OUTCOMES: Outcome[] = ['success', 'failure', 'superseded'];

/**
 * The one audit action of a workflow, read off the columns it already has. An API account is only ever
 * created, deleted or restored, so every apply on one is its creation: a resubmit after a failed create
 * runs with the engine's `update` action but is still recorded as `api-account-create`.
 */
export const auditActionFor = ({ type, action, payload }: WorkflowIdentity): WorkflowAction => {
  const apiAccount = payload?.apiServiceAccount === true;
  switch (type) {
    case WorkflowType.INTEGRATION_DELETE:
      return apiAccount ? 'api-account-delete' : 'request-delete';
    case WorkflowType.INTEGRATION_RESTORE:
      return apiAccount ? 'api-account-restore' : 'request-restore';
    default:
      if (apiAccount) return 'api-account-create';
      return action === ACTION_TYPES.CREATE ? 'request-create' : 'request-update';
  }
};

/** The resource columns every event of a workflow operation carries. */
export const workflowEventScope = (payload: WorkflowRecord['payload']) => ({
  requestId: payload.id as number,
  ...(payload.teamId ? { teamId: Number(payload.teamId) } : {}),
  ...((payload as any).organizationId ? { organizationId: Number((payload as any).organizationId) } : {}),
});

type WorkflowEventTarget = WorkflowIdentity & Pick<WorkflowRecord, 'id' | 'correlationId'>;

/**
 * Writes one event for `workflow`'s operation, at most once: a terminal outcome
 * is skipped if the operation already has one (a replay after a crash, or a
 * supersede racing a finish), and a step event if the same step already
 * recorded the same outcome.
 *
 * Strict by default, so a step that cannot record its outcome fails and is
 * retried. `bestEffort` is for paths that must carry on regardless — a failure
 * being dead-lettered — where the log line is what alerts.
 */
export const recordWorkflowEvent = async (
  workflow: WorkflowEventTarget,
  event: { outcome: Outcome; step?: 'request-plan'; details?: OutcomeDetails },
  { transaction, bestEffort = false }: { transaction?: Transaction; bestEffort?: boolean } = {},
): Promise<void> => {
  // Correlation ids are always generated as UUIDs; guard anyway rather than fail an insert on the uuid column.
  if (!UUID.test(workflow.correlationId)) return;

  const action = event.step ?? auditActionFor(workflow);
  const terminal = !event.step && TERMINAL_OUTCOMES.includes(event.outcome);

  const write = async () => {
    const existing = await models.event.count({
      where: {
        operationId: workflow.correlationId,
        eventCode: action,
        outcome: terminal ? { [Op.in]: TERMINAL_OUTCOMES } : event.outcome,
      },
      transaction,
    });
    if (existing > 0) return;

    await audit.createEvent(
      {
        action,
        outcome: event.outcome,
        operationId: workflow.correlationId,
        workflowId: workflow.id,
        ...workflowEventScope(workflow.payload),
        details: (event.details ?? {}) as AuditDetails<typeof action>,
      },
      transaction,
    );
  };

  await withActor(systemActor('workflow-engine'), async () => {
    if (!bestEffort) return write();
    try {
      await write();
    } catch {
      // createEvent has already logged audit_event_write_failed.
    }
  });
};

/**
 * Closes out a submission that lost the race to insert the first workflow and adopted the winner's. Its
 * own operation never runs, so it ends `superseded` by the winner's, next to its `requested` row.
 */
export const recordAdoptedSubmission = async (
  operationId: string,
  winner: { workflowId: string; correlationId: string; auditAction: WorkflowAction },
  scope: ReturnType<typeof workflowEventScope>,
  transaction?: Transaction,
) =>
  withActor(systemActor('workflow-engine'), () =>
    audit.createEvent(
      {
        action: winner.auditAction,
        outcome: 'superseded',
        operationId,
        workflowId: winner.workflowId,
        ...scope,
        details: { supersededByWorkflowId: winner.workflowId, supersededByOperationId: winner.correlationId },
      },
      transaction,
    ),
  );

/** Marks workflows' operations `superseded`, in the transaction that changed their state. */
export const recordSuperseded = async (
  workflows: WorkflowEventTarget[],
  by: { workflowId?: string; operationId: string },
  transaction?: Transaction,
) => {
  for (const workflow of workflows) {
    await recordWorkflowEvent(
      workflow,
      {
        outcome: 'superseded',
        details: {
          ...(by.workflowId ? { supersededByWorkflowId: by.workflowId } : {}),
          supersededByOperationId: by.operationId,
        },
      },
      { transaction },
    );
  }
};

const APPLY_ACTIONS: WorkflowAction[] = ['request-create', 'request-update', 'api-account-create'];

/**
 * How many times an integration's Keycloak clients have been applied (or an apply attempted past planning):
 * the engine's terminal create/update outcomes, plus `request-apply` rows written before @sso/audit. A
 * `requested` row, or a submission event from before @sso/audit, is not an apply and is never counted.
 */
export const countApplyOutcomes = async (
  requestId: number,
  { successOnly = false, transaction }: { successOnly?: boolean; transaction?: Transaction } = {},
): Promise<number> =>
  models.event.count({
    where: {
      requestId,
      [Op.or]: [
        { eventCode: 'request-apply', ...(successOnly ? { outcome: 'success' } : {}) },
        {
          eventCode: { [Op.in]: APPLY_ACTIONS },
          workflowId: { [Op.ne]: null },
          outcome: successOnly ? 'success' : { [Op.in]: ['success', 'failure'] },
          [Op.and]: [models.event.sequelize.literal(`coalesce(details->>'failedStep', '') <> 'PLAN'`)],
        },
      ],
    },
    transaction,
  });
