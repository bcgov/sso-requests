import { DataTypes } from 'sequelize';

export const name = '2022.02.24T11.35.00.add-additional-email-in-user-table.ts';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users', 'additional_email', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users', 'additional_email');
};

export default { name, up, down };
