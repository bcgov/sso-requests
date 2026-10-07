const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'requestWorkflowFailure',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      requestWorkflowId: {
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
      tableName: 'request_workflow_failures',
      underscored: true,
    },
  );
};

export default init;
