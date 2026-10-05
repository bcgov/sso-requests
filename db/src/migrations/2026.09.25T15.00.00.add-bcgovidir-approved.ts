import { DataTypes } from 'sequelize';

export const name = '2026.09.25T15.00.00.add-bcgovidir-approved';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'bcgovidir_approved', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'bcgovidir_approved');
};

export default { name, up, down };
