import { DataTypes } from 'sequelize';

export const name = '2022.08.8T08.08.08.add-assertion-lifespan-in-request-table';

const envs = ['dev', 'test', 'prod'];
const types = ['assertion_lifespan'];

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
