import { DataTypes } from 'sequelize';

export const name = '2022.04.08T09.15.00.add-token-fields-in-request-table';

const envs = ['dev', 'test', 'prod'];
const types = [
  'access_token_lifespan',
  'offline_session_idle_timeout',
  'offline_session_max_lifespan',
  'session_idle_timeout',
  'session_max_lifespan',
];

export const up = async ({ context: sequelize }) => {
  for (let x = 0; x < envs.length; x++) {
    for (let y = 0; y < types.length; y++) {
      await sequelize.getQueryInterface().addColumn('requests', `${envs[x]}_${types[y]}`, {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      });
    }
  }
};

export const down = async ({ context: sequelize }) => {
  for (let x = 0; x < envs.length; x++) {
    for (let y = 0; y < types.length; y++) {
      await sequelize.getQueryInterface().removeColumn('requests', `${envs[x]}_${types[y]}`);
    }
  }
};

export default { name, up, down };
