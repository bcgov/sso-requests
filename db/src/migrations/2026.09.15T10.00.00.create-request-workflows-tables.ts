import { DataTypes } from 'sequelize';

export const name = '2026.09.15T10.00.00.create-request-workflows-tables';

// Durable store for the integration submission workflow. Workflow + step state must survive a pod
// restart mid-flight, so every transition is written here before any side effect is attempted.
export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('request_workflows', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    correlationId: {
      type: DataTypes.TEXT,
      field: 'correlation_id',
      allowNull: false,
    },
    requestId: {
      type: DataTypes.INTEGER,
      field: 'request_id',
      allowNull: false,
      references: { model: 'requests', key: 'id' },
      onDelete: 'CASCADE',
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    action: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    state: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'PENDING',
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    context: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    currentStep: {
      type: DataTypes.TEXT,
      field: 'current_step',
      allowNull: true,
    },
    lastError: {
      type: DataTypes.TEXT,
      field: 'last_error',
      allowNull: true,
    },
    claimedBy: {
      type: DataTypes.TEXT,
      field: 'claimed_by',
      allowNull: true,
    },
    claimedAt: {
      type: DataTypes.DATE,
      field: 'claimed_at',
      allowNull: true,
    },
    runAfter: {
      type: DataTypes.DATE,
      field: 'run_after',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    startedAt: {
      type: DataTypes.DATE,
      field: 'started_at',
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Worker claim query filters on exactly these two columns.
  await queryInterface.addIndex('request_workflows', ['state', 'run_after'], {
    name: 'request_workflows_state_run_after_idx',
  });

  await queryInterface.addIndex('request_workflows', ['request_id'], {
    name: 'request_workflows_request_id_idx',
  });

  // De-duplication guard: a single integration can only have one in-flight workflow at a time, so a
  // double-submit (or a retried HTTP request) can never spawn a second concurrent workflow.
  await sequelize.query(`
    CREATE UNIQUE INDEX request_workflows_one_active_per_request_idx
    ON request_workflows (request_id)
    WHERE state IN ('PENDING', 'RUNNING', 'COMPENSATING')
  `);

  await queryInterface.createTable('request_workflow_steps', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    requestWorkflowId: {
      type: DataTypes.UUID,
      field: 'request_workflow_id',
      allowNull: false,
      references: { model: 'request_workflows', key: 'id' },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    label: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sequence: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    state: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'PENDING',
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    compensationAttempts: {
      type: DataTypes.INTEGER,
      field: 'compensation_attempts',
      allowNull: false,
      defaultValue: 0,
    },
    lastError: {
      type: DataTypes.TEXT,
      field: 'last_error',
      allowNull: true,
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    startedAt: {
      type: DataTypes.DATE,
      field: 'started_at',
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      field: 'completed_at',
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  // Step rows double as the idempotency ledger: a step that is already COMPLETED is a no-op on
  // replay, which is what makes re-delivering the same workflow command safe.
  await queryInterface.addConstraint('request_workflow_steps', {
    fields: ['request_workflow_id', 'name'],
    type: 'unique',
    name: 'request_workflow_steps_request_workflow_id_name_key',
  });

  await queryInterface.createTable('request_workflow_failures', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
    },
    requestWorkflowId: {
      type: DataTypes.UUID,
      field: 'request_workflow_id',
      allowNull: true,
    },
    requestId: {
      type: DataTypes.INTEGER,
      field: 'request_id',
      allowNull: true,
    },
    correlationId: {
      type: DataTypes.TEXT,
      field: 'correlation_id',
      allowNull: true,
    },
    failedStep: {
      type: DataTypes.TEXT,
      field: 'failed_step',
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    acknowledged: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('request_workflow_failures', ['acknowledged'], {
    name: 'request_workflow_failures_acknowledged_idx',
  });

  // A submission that arrives while another workflow owns the integration is parked as QUEUED and
  // promoted when that workflow finishes. At most one follow-up per integration: a newer submit
  // overwrites the queued payload so the latest desired state always wins.
  //
  // QUEUED is deliberately absent from `request_workflows_one_active_per_request_idx`, otherwise the
  // queued row would collide with the workflow it is waiting behind.
  await sequelize.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS request_workflows_one_queued_per_request_idx
    ON request_workflows (request_id)
    WHERE state = 'QUEUED'
  `);
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('request_workflow_failures');
  await sequelize.getQueryInterface().dropTable('request_workflow_steps');
  await sequelize.getQueryInterface().dropTable('request_workflows');
  await sequelize.query(`DROP INDEX IF EXISTS request_workflows_one_queued_per_request_idx`);
};

export default { name, up, down };
