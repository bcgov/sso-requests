import { DataTypes } from 'sequelize';

export const name = '2022.03.03T00.00.00.add-displayname-field-in-user-table.ts';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users', 'display_name', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users', 'display_name');
};

export default { name, up, down };
