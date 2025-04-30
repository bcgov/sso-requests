import { DataTypes } from 'sequelize';

export const name = '2024.12.03T10.55.55.request-queue-attempts-column';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('request_queues', 'attempts', {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('request_queues', 'attempts');
};

export default { name, up, down };
