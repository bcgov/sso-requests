import { DataTypes } from 'sequelize';

export const name = '2026.10.21T16.00.00.add-audit-event-context';

// Turns `events` into the audit record described in packages/audit: an action in
// `event_code` and its outcome in `outcome`, resource and target columns, and a
// required actor. None of the resource columns carry a foreign key, so an
// event outlives the row it is about.
//
// The backfill is mechanical: it splits a `-success`/`-failure` suffix into
// `outcome` and copies values the old `details` hold directly. `details` itself
// is never rewritten.

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

// Released codes that never had a `-success` suffix, for `down`.
const UNSUFFIXED_CODES = [
  'request-limit-reached',
  'team-admin-removal',
  'sdx-access-request-update',
  'organization-member-added',
  'organization-member-removed',
  'organization-member-role-updated',
  'organization-team-invited',
  'organization-team-joined',
  'organization-team-declined',
  'organization-team-left',
  'organization-consent-updated',
  'organization-overrides-updated',
];

const INDEXES: [string, string[]][] = [
  ['events_request_id_idx', ['request_id']],
  ['events_team_id_idx', ['team_id']],
  ['events_organization_id_idx', ['organization_id']],
  ['events_workflow_id_idx', ['workflow_id']],
  ['events_operation_id_idx', ['operation_id']],
  ['events_parent_operation_id_idx', ['parent_operation_id']],
  ['events_target_idx', ['target_type', 'target_id']],
  ['events_outcome_created_at_idx', ['outcome', 'created_at']],
];

export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  // History must survive deletes, so drop whatever foreign keys `events` has
  // (the 2021 table put one on request_id).
  const [foreignKeys] = await sequelize.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.events'::regclass AND contype = 'f'
  `);
  for (const { conname } of foreignKeys) {
    await sequelize.query(`ALTER TABLE events DROP CONSTRAINT "${conname}"`);
  }

  await queryInterface.addColumn('events', 'outcome', {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'success',
  });
  await queryInterface.addColumn('events', 'operation_id', { type: DataTypes.UUID, allowNull: true });
  await queryInterface.addColumn('events', 'parent_operation_id', { type: DataTypes.UUID, allowNull: true });
  await queryInterface.addColumn('events', 'team_id', { type: DataTypes.INTEGER, allowNull: true });
  await queryInterface.addColumn('events', 'workflow_id', { type: DataTypes.UUID, allowNull: true });
  await queryInterface.addColumn('events', 'target_type', { type: DataTypes.STRING(32), allowNull: true });
  await queryInterface.addColumn('events', 'target_id', { type: DataTypes.STRING(255), allowNull: true });
  await queryInterface.addColumn('events', 'environment', { type: DataTypes.STRING(16), allowNull: true });
  await queryInterface.addColumn('events', 'actor_type', {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'user',
  });
  await queryInterface.addColumn('events', 'actor_id', { type: DataTypes.STRING(255), allowNull: true });
  await queryInterface.addColumn('events', 'req_id', { type: DataTypes.STRING(64), allowNull: true });

  await sequelize.query(`
    ALTER TABLE events
      ADD CONSTRAINT events_outcome_check
      CHECK (outcome IN ('requested', 'success', 'failure', 'superseded'))
  `);
  await sequelize.query(`
    ALTER TABLE events
      ADD CONSTRAINT events_actor_type_check
      CHECK (actor_type IN ('user', 'service-account', 'system'))
  `);

  // Action and outcome. Codes without a suffix keep the default `success`.
  await sequelize.query(`
    UPDATE events
    SET outcome = 'failure', event_code = left(event_code, length(event_code) - length('-failure'))
    WHERE event_code LIKE '%-failure'
  `);
  await sequelize.query(`
    UPDATE events
    SET event_code = left(event_code, length(event_code) - length('-success'))
    WHERE event_code LIKE '%-success'
  `);

  // Actor. Rows with no idir user were written by the system.
  await sequelize.query(`UPDATE events SET actor_id = idir_userid WHERE idir_userid IS NOT NULL`);
  await sequelize.query(`UPDATE events SET actor_type = 'system' WHERE idir_userid IS NULL`);

  // Resource columns, from the details fields that held them.
  await sequelize.query(`
    UPDATE events SET team_id = (details->>'teamId')::integer
    WHERE team_id IS NULL AND details->>'teamId' ~ '^[0-9]+$'
  `);
  await sequelize.query(`
    UPDATE events SET workflow_id = (details->>'workflowId')::uuid
    WHERE workflow_id IS NULL AND details->>'workflowId' ~ '${UUID_PATTERN}'
  `);
  await sequelize.query(`
    UPDATE events SET environment = details->>'environment'
    WHERE environment IS NULL AND details->>'environment' IN ('dev', 'test', 'prod')
  `);

  // Target. A Keycloak username first, the app user otherwise.
  await sequelize.query(`
    UPDATE events
    SET target_type = CASE WHEN lower(trim(details->>'username')) LIKE 'service-account-%'
                           THEN 'service-account' ELSE 'user' END,
        target_id = lower(trim(details->>'username'))
    WHERE target_id IS NULL AND coalesce(trim(details->>'username'), '') <> ''
  `);
  await sequelize.query(`
    UPDATE events SET target_type = 'app-user', target_id = details->>'userId'
    WHERE target_id IS NULL AND details->>'userId' ~ '^[0-9]+$'
  `);

  // A workflow's correlation id is the operation id of everything it records.
  await sequelize.query(`
    UPDATE events AS e
    SET operation_id = w.correlation_id::uuid
    FROM request_workflows AS w
    WHERE e.operation_id IS NULL AND e.workflow_id = w.id AND w.correlation_id ~ '${UUID_PATTERN}'
  `);

  for (const [indexName, fields] of INDEXES) {
    await queryInterface.addIndex('events', fields, { name: indexName });
  }
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  for (const [indexName] of [...INDEXES].reverse()) {
    await queryInterface.removeIndex('events', indexName);
  }
  await sequelize.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_actor_type_check`);
  await sequelize.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_outcome_check`);

  // Put the suffix back. Every failure had one; a success had one unless its
  // released code never did. `requested` and `superseded` rows have no older
  // code to return to and keep theirs.
  await sequelize.query(`UPDATE events SET event_code = event_code || '-failure' WHERE outcome = 'failure'`);
  await sequelize.query(
    `UPDATE events SET event_code = event_code || '-success'
     WHERE outcome = 'success' AND event_code NOT IN (:unsuffixed)`,
    { replacements: { unsuffixed: UNSUFFIXED_CODES } },
  );

  for (const column of [
    'req_id',
    'actor_id',
    'actor_type',
    'environment',
    'target_id',
    'target_type',
    'workflow_id',
    'team_id',
    'parent_operation_id',
    'operation_id',
    'outcome',
  ]) {
    await queryInterface.removeColumn('events', column);
  }

  // NOT VALID: rows may reference requests deleted while there was no key.
  await sequelize.query(`
    ALTER TABLE events
      ADD CONSTRAINT events_request_id_fkey FOREIGN KEY (request_id) REFERENCES requests (id) NOT VALID
  `);
};

export default { name, up, down };
