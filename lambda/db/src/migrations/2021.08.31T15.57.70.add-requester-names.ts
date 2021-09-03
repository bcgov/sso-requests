const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'idir_user_display_name', {
    type: DataTypes.STRING,
  });
  await sequelize.getQueryInterface().addColumn('events', 'idir_user_display_name', {
    type: DataTypes.STRING,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'idir_user_display_name');
  await sequelize.getQueryInterface().removeColumn('events', 'idir_user_display_name');
};
