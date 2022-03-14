import { models } from './models';
import { User } from '../../interfaces';

const init = (sequelize, DataTypes) => {
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
        Team.hasMany(models.request, { foreignKey: 'teamId' });
      },
    },
  );

  Team.prototype.isTeamAdmin = async function (user: User) {
    return (
      (await models.usersTeam.count({ where: { teamId: this.id, userId: user.id, pending: false, role: 'admin' } })) > 0
    );
  };

  return Team;
};

export default init;
