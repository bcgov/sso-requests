const init = (sequelize: any, DataTypes: any) => {
  // The upper bound a team has consented to for one organization. Expressed in
  // the same vocabulary as api_account_grants so that checking a proposed grant
  // against it is a subset test, and NULL means "any" in both.
  const OrganizationTeamCeiling = sequelize.define(
    'organizationTeamCeiling',
    {
      organizationTeamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      level: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      environment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'organization_team_ceilings',
      underscored: true,
      associate: function (models: any) {
        OrganizationTeamCeiling.belongsTo(models.organizationTeam, {
          foreignKey: 'organizationTeamId',
          targetKey: 'id',
        });
      },
    },
  );
  return OrganizationTeamCeiling;
};

export default init;
