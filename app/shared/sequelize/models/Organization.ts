import { models } from './models';
import { User } from '../../interfaces';

const init = (sequelize: any, DataTypes: any) => {
  const Organization = sequelize.define(
    'organization',
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      underscored: true,
      associate: function (models: any) {
        Organization.hasMany(models.organizationMember, {
          foreignKey: 'organizationId',
          onDelete: 'cascade',
          hooks: true,
        });
        Organization.hasMany(models.organizationTeam, {
          foreignKey: 'organizationId',
          onDelete: 'cascade',
          hooks: true,
        });
        Organization.hasMany(models.request, {
          foreignKey: 'organizationId',
          onDelete: 'SET NULL',
        });
      },
    },
  );

  Organization.prototype.isOrgAdmin = async function (user: User) {
    return (
      (await models.organizationMember.count({
        where: { organizationId: this.id, userId: user.id, pending: false, role: 'admin' },
      })) > 0
    );
  };

  return Organization;
};

export default init;
