import { DataTypes } from 'sequelize';

export const name = '2025.08.22T09.00.00.create-api-usage-metrics';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('api_usage_metrics', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    method: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    teamId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'team_id',
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'status_code',
    },
    responseTimeMs: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'response_time_ms',
    },
  });

  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['timestamp']);
  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['method']);
  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['endpoint']);
  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['team_id']);
  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['status_code']);
  await sequelize.getQueryInterface().addIndex('api_usage_metrics', ['response_time_ms']);
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['timestamp']);
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['method']);
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['endpoint']);
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['team_id']);
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['status_code']);
  await sequelize.getQueryInterface().removeIndex('api_usage_metrics', ['response_time_ms']);
  await sequelize.getQueryInterface().dropTable('api_usage_metrics');
};
