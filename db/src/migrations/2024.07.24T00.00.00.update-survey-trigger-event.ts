import { DataTypes } from 'sequelize';

export const name = '2024.07.24T00.00.00.update-survey-trigger-event';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('surveys', 'triggerEvent', {
    type: DataTypes.STRING,
    field: 'trigger_event',
    allowNull: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('surveys', 'triggerEvent', {
    type: DataTypes.ENUM('createRole', 'addUserToRole', 'cssApiRequest', 'createIntegration'),
    field: 'trigger_event',
    allow_null: false,
  });
};

export default { name, up, down };
