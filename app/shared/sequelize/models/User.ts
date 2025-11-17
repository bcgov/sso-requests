import { lowcase } from '@app/helpers/string';

const init = (sequelize: any, DataTypes: any) => {
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
        set(value: string) {
          //@ts-ignore
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
        set(value: string) {
          //@ts-ignore
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
      associate: function (models: any) {
        User.hasMany(models.usersTeam, { foreignKey: 'userId', onDelete: 'cascade', hooks: true });
      },
    },
  );

  return User;
};

export default init;
