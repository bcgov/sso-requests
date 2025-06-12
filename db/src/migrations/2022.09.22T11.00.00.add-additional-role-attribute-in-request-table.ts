import { DataTypes } from 'sequelize';

export const name = '2022.09.22T11.00.00.add-additional-role-attribute-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'additional_role_attribute', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'additional_role_attribute');
};

export default { name, up, down };
