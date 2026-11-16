import { LEGACY_AUDIT_ACTIONS, OUTCOMES, WORKFLOW_ACTIONS } from '../src/vocabulary';

// Properties every `events` table must have, as SQL that returns the rows breaking each one. The app's and
// the api's integration tests run these against their test database before every wipe, so a code path that
// leaves the audit record inconsistent fails the test file that exercised it.

const TERMINAL = OUTCOMES.filter((outcome) => outcome !== 'requested')
  .map((outcome) => `'${outcome}'`)
  .join(', ');
const WORKFLOW = WORKFLOW_ACTIONS.map((action) => `'${action}'`).join(', ');
const LEGACY = LEGACY_AUDIT_ACTIONS.map((action) => `'${action}'`).join(', ');

export const AUDIT_INVARIANTS: { name: string; sql: string }[] = [
  {
    name: 'every requested operation has exactly one outcome',
    sql: `SELECT r.id, r.event_code, r.operation_id, count(o.id) AS outcomes
          FROM events r
          LEFT JOIN events o ON o.operation_id = r.operation_id AND o.event_code = r.event_code
                            AND o.outcome IN (${TERMINAL})
          WHERE r.outcome = 'requested'
          GROUP BY r.id
          HAVING count(o.id) <> 1`,
  },
  {
    name: 'no operation has more than one outcome',
    sql: `SELECT operation_id, event_code, count(*) AS outcomes
          FROM events
          WHERE operation_id IS NOT NULL AND outcome IN (${TERMINAL})
          GROUP BY operation_id, event_code
          HAVING count(*) > 1`,
  },
  {
    // Rows from before @sso/audit (seeded by tests that cover reading them) may have none.
    name: 'every row has an actor',
    sql: `SELECT id, event_code FROM events WHERE actor_id IS NULL AND event_code NOT IN (${LEGACY})`,
  },
  {
    name: 'workflow-backed operations name their workflow',
    sql: `SELECT id, event_code, operation_id FROM events
          WHERE event_code IN (${WORKFLOW}) AND operation_id IS NOT NULL AND workflow_id IS NULL`,
  },
  {
    name: 'every parent operation exists',
    sql: `SELECT e.id, e.event_code, e.parent_operation_id FROM events e
          WHERE e.parent_operation_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM events p
                            WHERE p.operation_id = e.parent_operation_id AND p.parent_operation_id IS NULL)`,
  },
  {
    name: 'rows are never updated',
    sql: `SELECT id, event_code FROM events WHERE updated_at <> created_at`,
  },
];

type Query = (sql: string) => Promise<unknown[]>;

/** Runs every invariant and throws one error listing all the rows that break any of them. */
export const assertAuditInvariants = async (query: Query) => {
  const broken: string[] = [];
  for (const { name, sql } of AUDIT_INVARIANTS) {
    const rows = await query(sql);
    if (rows.length > 0) broken.push(`${name}:\n${rows.map((row) => `  ${JSON.stringify(row)}`).join('\n')}`);
  }
  if (broken.length > 0) throw new Error(`audit invariants broken\n${broken.join('\n')}`);
};
