import { DataTypes } from 'sequelize';

export const name = '2026.08.07T14.00.00.create-sdx-requests-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('sdx_requests', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    request_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'requests',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
    },
    requester: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    scopes: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('sdx_requests');
};

export default { name, up, down };
