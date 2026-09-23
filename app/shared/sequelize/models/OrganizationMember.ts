const init = (sequelize: any, DataTypes: any) => {
  // Membership of an organization, independent of any team membership. The role
  // governs the organization itself — its members, its teams, its API accounts.
  // It confers no integration authority of its own: both roles reach exactly
  // what the organization's links confer, so a member and an admin see the same
  // integrations.
  const OrganizationMember = sequelize.define(
    'organizationMember',
    {
      organizationId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      tableName: 'organization_members',
      underscored: true,
      associate: function (models: any) {
        OrganizationMember.belongsTo(models.organization, { foreignKey: 'organizationId', targetKey: 'id' });
        OrganizationMember.belongsTo(models.user, { foreignKey: 'userId', targetKey: 'id' });
      },
    },
  );

  return OrganizationMember;
};

export default init;
