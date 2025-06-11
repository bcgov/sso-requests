const init = (sequelize: any, DataTypes: any) => {
  const UsersTeam = sequelize.define(
    'usersTeam',
    {
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      teamId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pending: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
    },
    {
      underscored: true,
      associate: function (models: any) {
        UsersTeam.belongsTo(models.team, { foreignKey: 'teamId', targetKey: 'id' });
      },
    },
  );
  return UsersTeam;
};

export default init;
