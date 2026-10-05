const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'requestWorkflow',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      correlationId: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      action: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      state: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      payload: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      context: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currentStep: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      claimedBy: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      claimedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      runAfter: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      startedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: 'request_workflows',
      underscored: true,
    },
  );
};

export default init;
