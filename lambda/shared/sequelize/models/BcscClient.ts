const init = (sequelize, DataTypes) => {
  const BcscClient = sequelize.define(
    'bcscClient',
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        defaultValue: sequelize.UUIDV4,
        autoIncrement: true,
      },
      clientId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      clientSecret: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      registrationAccessToken: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      clientName: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      environment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
      associate: function (models) {
        BcscClient.belongsTo(models.request);
      },
    },
  );

  return BcscClient;
};

export default init;
