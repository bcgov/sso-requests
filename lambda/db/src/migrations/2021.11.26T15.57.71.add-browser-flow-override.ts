import { DataTypes } from 'sequelize';

export const name = '2021.11.26T15.57.71.add-browser-flow-override.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'browser_flow_override', {
    type: DataTypes.STRING,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'browser_flow_override');
};

export default { name, up, down };
