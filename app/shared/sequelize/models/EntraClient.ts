const init = (sequelize: any, DataTypes: any) => {
  const EntraClient = sequelize.define(
    'entraClient',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        defaultValue: sequelize.UUIDV4,
        autoIncrement: true,
      },
      appName: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      appId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      secret: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      servicePrincipalId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      secretExpiryDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      environment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      underscored: true,
      associate: function (models: { request: any }) {
        EntraClient.belongsTo(models.request);
      },
    },
  );

  return EntraClient;
};

export default init;
