const init = (sequelize: any, DataTypes: any) => {
  // A team's link to an organization, carrying the team-wide consent. While
  // `pending` the organization has proposed `permissions` and the team has not
  // accepted, so nothing is in force. After acceptance the team owns the set:
  // an organization that wants more asks for a new invitation.
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
      // The expansion of whatever preset was chosen, never the preset's name:
      // editing a preset must not change what a team already agreed to.
      permissions: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [],
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
        OrganizationTeam.hasMany(models.organizationIntegrationOverride, {
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
