import { lowcase } from '@lambda-app/helpers/string';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'user',
    {
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      idirEmail: {
        type: DataTypes.STRING,
        allowNull: false,
        set(value) {
          this.setDataValue('idirEmail', lowcase(value));
        },
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      additionalEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
          this.setDataValue('additionalEmail', lowcase(value));
        },
      },
    },
    {
      underscored: true,
      associate: function (models) {
        User.hasMany(models.usersTeam, { foreignKey: 'userId', onDelete: 'cascade', hooks: true });
      },
    },
  );

  return User;
};
