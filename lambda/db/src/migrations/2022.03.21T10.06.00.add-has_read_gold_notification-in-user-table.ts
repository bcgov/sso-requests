import { DataTypes } from 'sequelize';

export const name = '2022.03.21T10.06.00.add-has_read_gold_notification-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users', 'has_read_gold_notification', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users', 'has_read_gold_notification');
};

export default { name, up, down };
