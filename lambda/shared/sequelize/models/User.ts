import { trim, toLower } from 'lodash';

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
      },
      additionalEmail: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
          this.setDataValue('additionalEmail', toLower(trim(value)));
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
