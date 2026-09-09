const init = (sequelize: any, DataTypes: any) => {
  // A team's link to an organization. While `pending` the org has proposed a
  // ceiling but the team has not consented to it yet, so nothing is in force.
  const OrganizationTeam = sequelize.define(
    'organizationTeam',
    {
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      teamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pending: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      invitedBy: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'organization_teams',
      underscored: true,
      associate: function (models: any) {
        OrganizationTeam.belongsTo(models.organization, { foreignKey: 'organizationId', targetKey: 'id' });
        OrganizationTeam.belongsTo(models.team, { foreignKey: 'teamId', targetKey: 'id' });
        OrganizationTeam.hasMany(models.organizationTeamCeiling, {
          foreignKey: 'organizationTeamId',
          onDelete: 'cascade',
          hooks: true,
        });
      },
    },
  );
  return OrganizationTeam;
};

export default init;
