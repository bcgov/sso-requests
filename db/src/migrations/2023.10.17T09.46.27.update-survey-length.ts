import { DataTypes } from 'sequelize';

export const name = '2023.10.17T09.46.27.update-survey-length';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('surveys', 'message', {
    type: DataTypes.STRING(700),
    field: 'message',
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('surveys', 'message', {
    type: DataTypes.STRING,
    field: 'message',
    allowNull: true,
  });
};

export default { name, up, down };
