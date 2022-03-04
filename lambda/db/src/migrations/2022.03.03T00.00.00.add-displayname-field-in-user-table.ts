const { DataTypes } = require('sequelize');

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users', 'display_name', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users', 'display_name');
};
