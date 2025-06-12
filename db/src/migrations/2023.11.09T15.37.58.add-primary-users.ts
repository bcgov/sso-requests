import { DataTypes } from 'sequelize';

export const name = '2023.11.09T15.37.58.add-primary-users';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'primary_end_users', {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'primary_end_users_other', {
    type: DataTypes.TEXT,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'primary_end_users');
  await sequelize.getQueryInterface().removeColumn('requests', 'primary_end_users_other');
};

export default { name, up, down };
