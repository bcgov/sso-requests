import { DataTypes } from 'sequelize';

export const name = '2026.10.13T14.43.00.update-requests-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'bcgovidir_approved');

  await sequelize.getQueryInterface().addColumn('requests', 'entra_guest_accounts_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'entra_guest_accounts_enabled');

  await sequelize.getQueryInterface().addColumn('requests', 'bcgovidir_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export default { name, up, down };
