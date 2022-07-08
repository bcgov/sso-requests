import { DataTypes } from 'sequelize';

export const name = '2022.07.06T17.00.00.add-auth-type-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'auth_type', {
    type: DataTypes.STRING,
    defaultValue: 'browser-login',
    allowNull: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'auth_type');
};

export default { name, up, down };
