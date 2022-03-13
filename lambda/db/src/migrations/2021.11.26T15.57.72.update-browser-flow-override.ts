import { DataTypes } from 'sequelize';

export const name = '2021.11.26T15.57.72.update-browser-flow-override.js';

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

export default { name, up, down };
