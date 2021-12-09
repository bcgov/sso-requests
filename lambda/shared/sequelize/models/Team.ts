module.exports = (sequelize, DataTypes) => {
  const Team = sequelize.define(
    'team',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      underscored: true,
      associate: function (models) {
        Team.hasMany(models.usersTeam, { foreignKey: 'teamId', onDelete: 'cascade', hooks: true });
      },
    },
  );

  return Team;
};
