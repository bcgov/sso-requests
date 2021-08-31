const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'firstName', {
    type: DataTypes.STRING,
  });
  await sequelize.getQueryInterface().addColumn('requests', 'lastName', {
    type: DataTypes.STRING,
  });
  await sequelize.getQueryInterface().addColumn('events', 'lastName', {
    type: DataTypes.STRING,
  });
  await sequelize.getQueryInterface().addColumn('events', 'firstName', {
    type: DataTypes.STRING,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'firstName');
  await sequelize.getQueryInterface().removeColumn('requests', 'lastName');
  await sequelize.getQueryInterface().removeColumn('events', 'firstName');
  await sequelize.getQueryInterface().removeColumn('events', 'lastName');
};
