import { DataTypes } from 'sequelize';

export const name = '2021.12.18T15.57.20.update-users-table.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('users', 'idir_userid', {
    type: DataTypes.STRING,
    field: 'idir_userid',
    allowNull: true,
  });
  await sequelize.getQueryInterface().changeColumn('users', 'idir_email', {
    type: DataTypes.STRING,
    field: 'idir_email',
    allowNull: false,
    unique: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('users', 'idir_userid', {
    type: DataTypes.STRING,
    field: 'idir_userid',
    allowNull: false,
  });
  await sequelize.getQueryInterface().changeColumn('users', 'idir_email', {
    type: DataTypes.STRING,
    field: 'idir_email',
    allowNull: false,
    unique: false,
  });
};

export default { name, up, down };
