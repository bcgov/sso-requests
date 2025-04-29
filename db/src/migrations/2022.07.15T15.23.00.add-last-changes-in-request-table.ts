import { DataTypes } from 'sequelize';

export const name = '2022.07.15T15.23.00.add-last-changes-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'last_changes', {
    type: DataTypes.JSONB,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'last_changes');
};

export default { name, up, down };
