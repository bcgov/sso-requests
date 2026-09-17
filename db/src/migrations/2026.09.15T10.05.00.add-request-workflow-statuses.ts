export const name = '2026.09.15T10.05.00.add-request-workflow-statuses';

// `processing`  - workflow is actively applying the integration to Keycloak.
// `compensating` - a step failed permanently and the workflow is rolling back in reverse order.
export const up = async ({ context: sequelize }) => {
  await sequelize.query(`ALTER TYPE "enum_requests_status" ADD VALUE IF NOT EXISTS 'processing'`);
  await sequelize.query(`ALTER TYPE "enum_requests_status" ADD VALUE IF NOT EXISTS 'compensating'`);
};

// Postgres cannot drop a single enum label, so the type is rebuilt without the workflow values. Any
// row still parked on a workflow status is collapsed back to `submitted` first.
export const down = async ({ context: sequelize }) => {
  await sequelize.query(`UPDATE requests SET status = 'submitted' WHERE status IN ('processing', 'compensating')`);
  await sequelize.query(`ALTER TYPE "enum_requests_status" RENAME TO "enum_requests_status_old"`);
  await sequelize.query(`
    CREATE TYPE "enum_requests_status" AS ENUM (
      'draft', 'submitted', 'pr', 'prFailed', 'planned', 'planFailed', 'approved', 'applied', 'applyFailed'
    )
  `);
  await sequelize.query(`ALTER TABLE requests ALTER COLUMN status DROP DEFAULT`);
  await sequelize.query(`
    ALTER TABLE requests
    ALTER COLUMN status TYPE "enum_requests_status" USING status::text::"enum_requests_status"
  `);
  await sequelize.query(`ALTER TABLE requests ALTER COLUMN status SET DEFAULT 'draft'`);
  await sequelize.query(`DROP TYPE "enum_requests_status_old"`);
};

export default { name, up, down };
