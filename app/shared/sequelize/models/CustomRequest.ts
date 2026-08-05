const init = (sequelize: any, DataTypes: any) => {
  const CustomRequest = sequelize.define(
    'customRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      conditions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
      },
      comments: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      underscored: true,
      associate: function (models: any) {
        CustomRequest.belongsTo(models.request, { foreignKey: 'requestId', targetKey: 'id' });
      },
    },
  );
  return CustomRequest;
};

export default init;
