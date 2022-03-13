import { DataTypes } from 'sequelize';

export const name = '2021.08.31T15.57.70.add-requester-names.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'idir_user_display_name', {
    type: DataTypes.STRING,
  });
  await sequelize.getQueryInterface().addColumn('events', 'idir_user_display_name', {
    type: DataTypes.STRING,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'idir_user_display_name');
  await sequelize.getQueryInterface().removeColumn('events', 'idir_user_display_name');
};

export default { name, up, down };
