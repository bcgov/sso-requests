const init = (sequelize: any, DataTypes: any) => {
  const ApiAccountGrant = sequelize.define(
    'apiAccountGrant',
    {
      apiAccountId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // NULL on either target means "any", so a grant may cover a whole team,
      // a single integration, or every environment.
      teamId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      integrationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resource: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      environment: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'api_account_grants',
      underscored: true,
      associate: function (models: any) {
        ApiAccountGrant.belongsTo(models.request, { foreignKey: 'apiAccountId', targetKey: 'id' });
        ApiAccountGrant.belongsTo(models.team, { foreignKey: 'teamId', targetKey: 'id' });
      },
    },
  );
  return ApiAccountGrant;
};

export default init;
