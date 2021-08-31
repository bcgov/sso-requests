const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'idirUserDisplayName', {
    type: DataTypes.STRING,
    field: 'idir_user_display_name',
  });
  await sequelize.getQueryInterface().addColumn('events', 'idirUserDisplayName', {
    type: DataTypes.STRING,
    field: 'idir_user_display_name',
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'idirUserDisplayName');
  await sequelize.getQueryInterface().removeColumn('events', 'idirUserDisplayName');
};
