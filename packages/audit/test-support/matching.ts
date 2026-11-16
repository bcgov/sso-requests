// The shape of a set of event rows with everything that legitimately differs between the app and the api
// taken out: who acted, ids, timestamps, request ids. Operation ids become positions, so the structure
// (which rows answer which, which children belong to which parent) is kept and compared too.

type Row = {
  eventCode: string;
  outcome: string;
  operationId: string | null;
  parentOperationId: string | null;
  targetType: string | null;
  targetId: string | null;
  environment: string | null;
  details: Record<string, unknown> | null;
  id?: number;
};

export type NormalizedRow = {
  action: string;
  outcome: string;
  operation: number | null;
  parent: number | null;
  target: string | null;
  environment: string | null;
  details: Record<string, unknown>;
};

/**
 * Rows in the order they were written. `targetIds` maps ids that are expected to differ between the two
 * paths (a client's service account) to a stable placeholder.
 */
export const normalizeEventRows = (rows: Row[], targetIds: Record<string, string> = {}): NormalizedRow[] => {
  const ordered = [...rows].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const operations: string[] = [];
  const position = (operationId: string | null) => {
    if (!operationId) return null;
    if (!operations.includes(operationId)) operations.push(operationId);
    return operations.indexOf(operationId);
  };
  return ordered.map((row) => ({
    action: row.eventCode,
    outcome: row.outcome,
    operation: position(row.operationId),
    parent: position(row.parentOperationId),
    target: row.targetType ? `${row.targetType}:${targetIds[row.targetId ?? ''] ?? row.targetId}` : null,
    environment: row.environment,
    details: row.details ?? {},
  }));
};

const op = (
  action: string,
  operation: number,
  details: Record<string, unknown>,
  target: string,
  outcome = 'success',
  parent: number | null = null,
): NormalizedRow => ({ action, outcome, operation, parent, target, environment: 'dev', details });

/**
 * One scenario, run identically through the app and the api: create two roles, compose one of the other,
 * assign one role to a user, assign two at once, then revoke and delete. Both suites assert their rows
 * normalize to exactly this, so they match each other.
 */
export const ROLE_SCENARIO_ROWS: NormalizedRow[] = [
  op('role-create', 0, { roleName: 'matching-a' }, 'role:matching-a', 'requested'),
  op('role-create', 0, { roleName: 'matching-a' }, 'role:matching-a'),
  op('role-create', 1, { roleName: 'matching-b' }, 'role:matching-b', 'requested'),
  op('role-create', 1, { roleName: 'matching-b' }, 'role:matching-b'),
  op(
    'role-composite-update',
    2,
    { roleName: 'matching-a', add: ['matching-b'], remove: [] },
    'role:matching-a',
    'requested',
  ),
  op('role-composite-update', 2, { roleName: 'matching-a', add: ['matching-b'], remove: [] }, 'role:matching-a'),
  op('role-assign', 3, { roleName: 'matching-a' }, 'user:matching-user@idir', 'requested'),
  op('role-assign', 3, { roleName: 'matching-a' }, 'user:matching-user@idir'),
  op(
    'role-bulk-update',
    4,
    { add: ['matching-a', 'matching-b'], remove: [] },
    'service-account:SERVICE_ACCOUNT',
    'requested',
  ),
  op('role-assign', 5, { roleName: 'matching-a' }, 'service-account:SERVICE_ACCOUNT', 'requested', 4),
  op('role-assign', 6, { roleName: 'matching-b' }, 'service-account:SERVICE_ACCOUNT', 'requested', 4),
  op('role-assign', 5, { roleName: 'matching-a' }, 'service-account:SERVICE_ACCOUNT', 'success', 4),
  op('role-assign', 6, { roleName: 'matching-b' }, 'service-account:SERVICE_ACCOUNT', 'success', 4),
  {
    ...op('role-bulk-update', 4, { add: ['matching-a', 'matching-b'], remove: [] }, 'service-account:SERVICE_ACCOUNT'),
    details: { add: ['matching-a', 'matching-b'], remove: [], total: 2, succeeded: 2, failed: 0 },
  },
  op('role-unassign', 7, { roleName: 'matching-a' }, 'user:matching-user@idir', 'requested'),
  op('role-unassign', 7, { roleName: 'matching-a' }, 'user:matching-user@idir'),
  op('role-delete', 8, { roleName: 'matching-b' }, 'role:matching-b', 'requested'),
  op('role-delete', 8, { roleName: 'matching-b' }, 'role:matching-b'),
];
