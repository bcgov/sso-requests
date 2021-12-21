const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('users', 'idir_userid', {
    type: DataTypes.STRING,
    field: 'idir_userid',
    allowNull: true,
  });
  await sequelize.getQueryInterface().changeColumn('users', 'idir_email', {
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
    unique: false,
  });
};
