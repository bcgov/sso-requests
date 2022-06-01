import { DataTypes } from 'sequelize';

export const name = '2022.05.30T11.59.00.add-sa-columns-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'service_account_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'api_service_account', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'service_account_enabled');
  await sequelize.getQueryInterface().removeColumn('requests', 'api_service_account');
};

export default { name, up, down };
