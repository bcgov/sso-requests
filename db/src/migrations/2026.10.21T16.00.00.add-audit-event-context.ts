import { DataTypes } from 'sequelize';

export const name = '2026.10.21T16.00.00.add-audit-event-context';

export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.addColumn('events', 'team_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'teams', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('events', 'workflow_id', {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'request_workflows', key: 'id' },
    onDelete: 'SET NULL',
  });
  await queryInterface.addColumn('events', 'actor_type', {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'user',
  });
  await queryInterface.addColumn('events', 'actor_id', {
    type: DataTypes.STRING(255),
    allowNull: true,
  });

  await sequelize.query(`
    ALTER TABLE events
      ADD CONSTRAINT events_actor_type_check
      CHECK (actor_type IN ('user', 'service-account', 'system'))
  `);
  await sequelize.query(`
    UPDATE events
    SET actor_id = idir_userid
    WHERE actor_type = 'user' AND actor_id IS NULL AND idir_userid IS NOT NULL
  `);
  await sequelize.query(`
    UPDATE events AS e
    SET workflow_id = w.id
    FROM request_workflows AS w
    WHERE e.workflow_id IS NULL AND e.details->>'workflowId' = w.id::text
  `);

  await queryInterface.addIndex('events', ['team_id'], { name: 'events_team_id_idx' });
  await queryInterface.addIndex('events', ['workflow_id'], { name: 'events_workflow_id_idx' });
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();
  await queryInterface.removeIndex('events', 'events_workflow_id_idx');
  await queryInterface.removeIndex('events', 'events_team_id_idx');
  await sequelize.query(`ALTER TABLE events DROP CONSTRAINT IF EXISTS events_actor_type_check`);
  await queryInterface.removeColumn('events', 'actor_id');
  await queryInterface.removeColumn('events', 'actor_type');
  await queryInterface.removeColumn('events', 'workflow_id');
  await queryInterface.removeColumn('events', 'team_id');
};

export default { name, up, down };
