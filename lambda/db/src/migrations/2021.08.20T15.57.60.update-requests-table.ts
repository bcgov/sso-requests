const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'archived', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().changeColumn('requests', 'publicAccess', {
    type: DataTypes.BOOLEAN,
    field: 'public_access',
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'archived');
  await sequelize.getQueryInterface().changeColumn('requests', 'publicAccess', {
    type: DataTypes.BOOLEAN,
    field: 'public_access',
    allowNull: false,
    defaultValue: false,
  });
};
