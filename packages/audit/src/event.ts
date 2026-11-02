import type { Actor, ActorType } from './actor';
import type { AuditDetails } from './details';
import type { AuditAction, Environment, Outcome, TargetType } from './vocabulary';

type EventFields = {
  outcome: Outcome;
  operationId?: string;
  parentOperationId?: string;
  requestId?: number;
  teamId?: number;
  organizationId?: number;
  workflowId?: string;
  target?: { type: TargetType; id: string };
  environment?: Environment;
};

/**
 * One event, as a call site describes it. Everything the event is about is
 * passed here explicitly; only the actor and request id come from the audit
 * context. A union over actions, so `details` is checked against the action.
 */
export type AuditEvent<A extends AuditAction = AuditAction> = {
  [K in A]: EventFields & { action: K; details: AuditDetails<K> };
}[A];

// The attributes handed to an `event` model's `create`, i.e. one row.
export type AuditEventRow = {
  eventCode: string;
  outcome: Outcome;
  operationId: string | null;
  parentOperationId: string | null;
  requestId: number | null;
  teamId: number | null;
  organizationId: number | null;
  workflowId: string | null;
  targetType: TargetType | null;
  targetId: string | null;
  environment: Environment | null;
  actorType: ActorType;
  actorId: string;
  idirUserid: string | null;
  idirUserDisplayName: string | null;
  reqId: string | null;
  details: Record<string, unknown>;
};

export type ColumnType = 'integer' | 'uuid' | 'string' | 'jsonb';

export type AuditColumn = { column: string; type: ColumnType; allowNull: boolean; length?: number };

// The `events` columns this package writes, keyed by model attribute. The app
// and api `event` models are each checked against this, so neither can drift
// from what the writer produces.
export const AUDIT_EVENT_COLUMNS: { readonly [K in keyof AuditEventRow]: AuditColumn } = {
  eventCode: { column: 'event_code', type: 'string', allowNull: false },
  outcome: { column: 'outcome', type: 'string', allowNull: false, length: 16 },
  operationId: { column: 'operation_id', type: 'uuid', allowNull: true },
  parentOperationId: { column: 'parent_operation_id', type: 'uuid', allowNull: true },
  requestId: { column: 'request_id', type: 'integer', allowNull: true },
  teamId: { column: 'team_id', type: 'integer', allowNull: true },
  organizationId: { column: 'organization_id', type: 'integer', allowNull: true },
  workflowId: { column: 'workflow_id', type: 'uuid', allowNull: true },
  targetType: { column: 'target_type', type: 'string', allowNull: true, length: 32 },
  targetId: { column: 'target_id', type: 'string', allowNull: true, length: 255 },
  environment: { column: 'environment', type: 'string', allowNull: true, length: 16 },
  actorType: { column: 'actor_type', type: 'string', allowNull: false, length: 32 },
  actorId: { column: 'actor_id', type: 'string', allowNull: true, length: 255 },
  idirUserid: { column: 'idir_userid', type: 'string', allowNull: true },
  idirUserDisplayName: { column: 'idir_user_display_name', type: 'string', allowNull: true },
  reqId: { column: 'req_id', type: 'string', allowNull: true, length: 64 },
  details: { column: 'details', type: 'jsonb', allowNull: true },
};

/** Builds the row for `event`, attributed to `actor`. Pure; the writer supplies both from its context. */
export const toAuditEventRow = (event: AuditEvent, actor: Actor, reqId?: string): AuditEventRow => {
  if (event.outcome !== 'success' && !event.operationId) {
    throw new Error(`a ${event.outcome} event for ${event.action} needs an operation id`);
  }
  return {
    eventCode: event.action,
    outcome: event.outcome,
    operationId: event.operationId ?? null,
    parentOperationId: event.parentOperationId ?? null,
    requestId: event.requestId ?? null,
    teamId: event.teamId ?? null,
    organizationId: event.organizationId ?? null,
    workflowId: event.workflowId ?? null,
    targetType: event.target?.type ?? null,
    targetId: event.target?.id ?? null,
    environment: event.environment ?? null,
    actorType: actor.type,
    actorId: actor.id,
    // Kept for the existing Grafana panels, which group by these.
    idirUserid: actor.type === 'user' ? actor.id : null,
    idirUserDisplayName: actor.type === 'user' ? actor.displayName : null,
    reqId: reqId ?? null,
    details: { ...event.details },
  };
};
