const init = (sequelize: any, DataTypes: any) => {
  // A per-integration cap under one link. Resolution intersects it with the
  // link's permissions, so it can only narrow: an empty array is "no access to
  // this integration", and a row naming more than the link confers no more.
  // It is found through the integration's current team, which is what makes a
  // row left behind by a team reassignment inert.
  const OrganizationIntegrationOverride = sequelize.define(
    'organizationIntegrationOverride',
    {
      organizationTeamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      permissions: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
      },
    },
    {
      tableName: 'organization_integration_overrides',
      underscored: true,
      associate: function (models: any) {
        OrganizationIntegrationOverride.belongsTo(models.organizationTeam, {
          foreignKey: 'organizationTeamId',
          targetKey: 'id',
        });
        OrganizationIntegrationOverride.belongsTo(models.request, { foreignKey: 'requestId', targetKey: 'id' });
      },
    },
  );

  return OrganizationIntegrationOverride;
};

export default init;
