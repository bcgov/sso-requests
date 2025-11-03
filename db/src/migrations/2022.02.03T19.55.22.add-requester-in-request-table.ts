import { DataTypes } from 'sequelize';

export const name = '2022.02.03T19.55.22.add-requester-in-request-table.js';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'requester', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'requester');
};

export default { name, up, down };
