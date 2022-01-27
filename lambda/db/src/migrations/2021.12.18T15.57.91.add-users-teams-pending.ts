const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users_teams', 'pending', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users_teams', 'pending');
};
