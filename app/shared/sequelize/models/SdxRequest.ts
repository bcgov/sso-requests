const init = (sequelize: any, DataTypes: any) => {
  const SdxRequest = sequelize.define(
    'SdxRequest',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'requests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      submission_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      requester: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      access_request: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      tableName: 'sdx_requests',
      underscored: true,
    },
  );

  return SdxRequest;
};

export default init;
