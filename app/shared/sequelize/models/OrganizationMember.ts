const init = (sequelize: any, DataTypes: any) => {
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
      pending: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
