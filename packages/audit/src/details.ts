import type { AuditAction, Environment } from './vocabulary';

// The `details` each action writes. Resource ids (request, team, organization,
// workflow) and the target live in their own columns, so they are not repeated
// here. These shapes bind new writes only: rows written before this package
// carry older shapes, and readers must treat `details` from the database as
// unknown.

type None = Record<never, never>;

type MemberRole = string;

export type FieldChanges = unknown[];

// A user row's changed fields, each with its value before and after.
export type ChangedFields = Record<string, { before: unknown; after: unknown }>;

export type AuditDetailsMap = {
  'request-create': { changes?: FieldChanges };
  'request-update': { changes?: FieldChanges; comment?: string };
  'request-delete': None;
  'request-restore': None;
  'request-plan': None;
  'request-status-update': { before: string | null; after: string };
  'request-limit-reached': { limit: number; count: number };
  'email-submission': { code?: string };
  'transfer-of-ownership': { fromUserId: number; toUserId: number };
  // `count` is set on success: how many log lines were returned.
  'logs-download': { start: string; end: string; count?: number };

  'api-account-create': None;
  'api-account-delete': None;
  'api-account-restore': None;

  'secret-rotate': None;
  'credentials-view': None;

  'role-create': { roleName: string };
  'role-update': { roleName: string; newRoleName?: string };
  'role-delete': { roleName: string };
  'role-composite-update': { roleName: string; add: string[]; remove: string[] };
  // `replicatedFrom` names the idir user whose role a replicate copied to this azureidir user.
  'role-assign': { roleName: string; replicatedFrom?: string };
  'role-unassign': { roleName: string };
  'role-bulk-create': { roleNames: string[] };
  'role-bulk-update': { add: string[]; remove: string[] };
  'role-replicate': { roleName: string; sourceIdp: string; targetIdp: string };

  'sdx-request-create': { services: unknown };
  'sdx-access-request-update': { status?: string; resourceServers?: unknown[] };

  'team-create': { name: string };
  'team-update': { before?: Record<string, unknown>; after?: Record<string, unknown> };
  'team-delete': { name: string };
  'team-member-add': { role: MemberRole };
  'team-member-remove': { role: MemberRole; reason?: 'user-deleted' | 'team-deleted' };
  'team-member-role-update': { before: MemberRole; after: MemberRole };

  'user-create': None;
  'user-update': { changes: ChangedFields };
  // The deleted row's idir user id, since the target's app user id no longer names anyone afterwards.
  'user-delete': { idirUserid?: string | null; mergedIntoUserId?: number };
  'user-profile-update': { changes: ChangedFields };

  'organization-create': { name: string };
  'organization-update': { name: string };
  'organization-delete': { name: string };
  'organization-member-add': { role: MemberRole };
  'organization-member-remove': { reason?: 'organization-deleted' | 'user-deleted' };
  'organization-member-role-update': { role: MemberRole };
  'organization-team-invite': { permissions: string[] };
  'organization-team-join': { permissions: string[] };
  'organization-team-decline': None;
  'organization-team-leave': { removedBy: 'organization' | 'team'; reason?: 'organization-deleted' | 'team-deleted' };
  'organization-consent-update': { permissions: string[] };
  'organization-overrides-update': { count: number };
};

// Compile-time check that every action has a details shape and nothing else does.
type Exact<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _everyActionHasDetails: Exact<keyof AuditDetailsMap, AuditAction> = true;
void _everyActionHasDetails;

export type AuditError = { message: string; name?: string; status?: number };

// What an outcome row may add on top of the action's own details.
export type OutcomeDetails = {
  error?: AuditError;
  // The outside call succeeded but the DB mirror write that should follow it did not.
  stage?: 'local-sync';
  keycloakApplied?: boolean;
  supersededByWorkflowId?: string;
  supersededByOperationId?: string;
  // A workflow that failed: the step it failed at and why.
  failedStep?: string;
  reason?: string;
  // Batch parents, on their terminal row.
  total?: number;
  succeeded?: number;
  failed?: number;
};

export type AuditDetails<A extends AuditAction> = AuditDetailsMap[A] & OutcomeDetails;

const MAX_ERROR_MESSAGE = 500;

/**
 * Reduces a thrown value to what an audit row should keep: a bounded message and
 * an HTTP status where the error carries one. Never the whole error object,
 * which can hold request bodies and credentials.
 */
export const describeError = (err: unknown): AuditError => {
  const e = (err ?? {}) as {
    message?: unknown;
    name?: unknown;
    status?: unknown;
    statusCode?: unknown;
    response?: any;
  };
  const raw = typeof err === 'string' ? err : typeof e.message === 'string' ? e.message : String(err);
  const message = raw.length > MAX_ERROR_MESSAGE ? `${raw.slice(0, MAX_ERROR_MESSAGE)}…` : raw;
  const status = [e.status, e.statusCode, e.response?.status].find((s): s is number => typeof s === 'number');
  const name = typeof e.name === 'string' && e.name !== 'Error' ? e.name : undefined;
  return { message, ...(name ? { name } : {}), ...(status !== undefined ? { status } : {}) };
};
