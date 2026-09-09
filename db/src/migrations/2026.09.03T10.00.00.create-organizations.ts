import { DataTypes } from 'sequelize';

export const name = '2026.09.03T10.00.00.create-organizations';

export const up = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.createTable('organizations', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  // Organization membership is independent of team membership: being an org
  // admin says nothing about which teams you belong to, and vice versa.
  await queryInterface.createTable('organization_members', {
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'organization_id',
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: 'user_id',
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  // A team's link to an organization. `pending` covers the invitation the org
  // has extended but the team has not yet accepted; deleting the row is how a
  // team leaves, which is why it cascades to the ceiling below.
  await queryInterface.createTable('organization_teams', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_id',
      references: { model: 'organizations', key: 'id' },
      onDelete: 'CASCADE',
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'team_id',
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    pending: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    invitedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'invited_by',
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  await queryInterface.addConstraint('organization_teams', {
    fields: ['organization_id', 'team_id'],
    type: 'unique',
    name: 'organization_teams_organization_id_team_id_key',
  });

  // A team may belong to at most one organization, but may hold several
  // outstanding invitations while it decides.
  await sequelize.query(
    `CREATE UNIQUE INDEX organization_teams_team_id_active_key ON organization_teams (team_id) WHERE pending = false`,
  );

  // The ceiling a team consents to when it accepts an invitation. Expressed in
  // exactly the same vocabulary as api_account_grants so that checking a
  // proposed grant against it is a subset test, and so that narrowing a ceiling
  // takes effect without touching any grant.
  await queryInterface.createTable('organization_team_ceilings', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    organizationTeamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'organization_team_id',
      references: { model: 'organization_teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    integrationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'integration_id',
      references: { model: 'requests', key: 'id' },
      onDelete: 'CASCADE',
    },
    resource: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    environment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  });

  await queryInterface.addIndex('organization_teams', ['organization_id']);
  await queryInterface.addIndex('organization_teams', ['team_id']);
  await queryInterface.addIndex('organization_team_ceilings', ['organization_team_id']);

  // An org-level API account is a request row owned by an organization rather
  // than a team, so it is reachable from grants exactly like a team account.
  await queryInterface.addColumn('requests', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'organizations', key: 'id' },
    // Requests are retained for audit after their owning organization is deleted.
    onDelete: 'SET NULL',
  });

  await queryInterface.addColumn('events', 'organization_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  // Machine actors have no idir_userid, so without this an org account's
  // actions in the audit log are indistinguishable from each other.
  await queryInterface.addColumn('events', 'api_client_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await queryInterface.addColumn('api_usage_metrics', 'api_client_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  // Org accounts have no team, and existing rows are left untouched.
  await queryInterface.changeColumn('api_usage_metrics', 'team_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.addIndex('api_usage_metrics', ['api_client_id']);
};

export const down = async ({ context: sequelize }) => {
  const queryInterface = sequelize.getQueryInterface();

  await queryInterface.removeIndex('api_usage_metrics', ['api_client_id']);
  await queryInterface.removeColumn('api_usage_metrics', 'api_client_id');
  await queryInterface.removeColumn('events', 'api_client_id');
  await queryInterface.removeColumn('events', 'organization_id');
  await queryInterface.removeColumn('requests', 'organization_id');
  await queryInterface.dropTable('organization_team_ceilings');
  await queryInterface.dropTable('organization_teams');
  await queryInterface.dropTable('organization_members');
  await queryInterface.dropTable('organizations');
};
