const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'browser_flow_override', {
    type: DataTypes.STRING,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'browser_flow_override', {
    type: DataTypes.BOOLEAN,
  });
};
