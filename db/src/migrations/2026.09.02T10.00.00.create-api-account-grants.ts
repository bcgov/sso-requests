import { DataTypes, QueryTypes } from 'sequelize';

export const name = '2026.09.02T10.00.00.create-api-account-grants';

// Every (resource, action) pair an API account can hold. A legacy team-scoped
// account is granted all of them over its own team, which is exactly the
// unrestricted authority it has today.
const RESOURCE_ACTIONS: [string, string][] = [
  ['roles', 'read'],
  ['roles', 'write'],
  ['user-role-mappings', 'read'],
  ['user-role-mappings', 'write'],
  ['integrations', 'read'],
  ['integrations', 'write'],
  ['idp-users', 'read'],
];

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('api_account_grants', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    apiAccountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'api_account_id',
      references: { model: 'requests', key: 'id' },
      onDelete: 'CASCADE',
    },
    // NULL team_id and NULL integration_id both mean "any", so a grant may
    // target a whole team, a single integration, or (for wildcards) everything.
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'team_id',
      references: { model: 'teams', key: 'id' },
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
    // NULL means the grant applies to every environment.
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

  await sequelize.getQueryInterface().addIndex('api_account_grants', ['api_account_id']);
  await sequelize.getQueryInterface().addIndex('api_account_grants', ['team_id']);
  await sequelize.getQueryInterface().addIndex('api_account_grants', ['integration_id']);

  const accounts: { id: number; team_id: number }[] = await sequelize.query(
    `SELECT id, team_id FROM requests WHERE api_service_account = true AND team_id IS NOT NULL`,
    { type: QueryTypes.SELECT },
  );

  if (accounts.length === 0) return;

  const rows = accounts.flatMap((account) =>
    RESOURCE_ACTIONS.map(([resource, action]) => ({
      api_account_id: account.id,
      team_id: account.team_id,
      integration_id: null,
      resource,
      action,
      environment: null,
      created_at: new Date(),
      updated_at: new Date(),
    })),
  );

  await sequelize.getQueryInterface().bulkInsert('api_account_grants', rows);
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeIndex('api_account_grants', ['api_account_id']);
  await sequelize.getQueryInterface().removeIndex('api_account_grants', ['team_id']);
  await sequelize.getQueryInterface().removeIndex('api_account_grants', ['integration_id']);
  await sequelize.getQueryInterface().dropTable('api_account_grants');
};
