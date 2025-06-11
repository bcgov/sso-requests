import { DataTypes } from 'sequelize';

export const name = '2022.04.11T11.36.00.update-action-number-field-type';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'actionNumber', {
    type: DataTypes.BIGINT,
    field: 'action_number',
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'actionNumber', {
    type: DataTypes.INTEGER,
    field: 'action_number',
    allowNull: true,
  });
};

export default { name, up, down };
