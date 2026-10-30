import type { ActorType, Environment, RecordedOutcome, TargetType } from '@sso/audit';

// An `events` row as read back. Rows written before @sso/audit may lack the
// newer columns and carry older `details` shapes, so readers treat both as
// optional and `details` as untyped.
export interface Event {
  id?: number;
  eventCode?: string;
  outcome?: RecordedOutcome;
  operationId?: string | null;
  parentOperationId?: string | null;
  requestId?: number | null;
  teamId?: number | null;
  organizationId?: number | null;
  workflowId?: string | null;
  targetType?: TargetType | null;
  targetId?: string | null;
  environment?: Environment | null;
  actorType?: ActorType;
  actorId?: string | null;
  idirUserid?: string;
  idirUserDisplayName?: string;
  reqId?: string | null;
  details?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface Change {
  kind: string;
  path: string[];
  lhs?: string;
  rhs?: string;
  item?: any;
}
