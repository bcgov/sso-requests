import { DataTypes } from 'sequelize';

export const name = '2026.08.07T10.00.00.add-sdx-enabled';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'sdx_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'sdx_enabled');
};

export default { name, up, down };
