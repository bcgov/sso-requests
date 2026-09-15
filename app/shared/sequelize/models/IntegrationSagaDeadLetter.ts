const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'integrationSagaDeadLetter',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      sagaId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      correlationId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      failedStep: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      acknowledged: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'integration_saga_dead_letters',
      underscored: true,
    },
  );
};

export default init;
