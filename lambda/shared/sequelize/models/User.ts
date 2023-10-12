import { lowcase } from '@lambda-app/helpers/string';

const init = (sequelize, DataTypes) => {
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
      hasReadGoldNotification: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: 'has_read_gold_notification',
      },
      surveySubmissions: {
        type: DataTypes.JSONB,
        allowNull: true,
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

export default init;
