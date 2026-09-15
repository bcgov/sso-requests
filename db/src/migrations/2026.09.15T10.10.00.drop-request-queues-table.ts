import { DataTypes } from 'sequelize';

export const name = '2026.09.15T10.10.00.drop-request-queues-table';

// Superseded by integration_sagas / integration_saga_steps.
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('request_queues');
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('request_queues', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    requestId: {
      type: DataTypes.INTEGER,
      field: 'request_id',
      allowNull: true,
    },
    request: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  });
};

export default { name, up, down };
