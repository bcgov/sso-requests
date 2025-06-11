import { DataTypes } from 'sequelize';

export const name = '2022.08.4T11.00.00.add-protocol-in-request-table';

export const up = async ({ context: sequelize }) => {
  const defaultValue = 'oidc';

  await sequelize.getQueryInterface().addColumn('requests', 'protocol', {
    type: DataTypes.STRING,
    defaultValue,
    allowNull: false,
  });

  await sequelize.getQueryInterface().bulkUpdate('requests', { protocol: defaultValue }, { protocol: null });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'protocol');
};

export default { name, up, down };
