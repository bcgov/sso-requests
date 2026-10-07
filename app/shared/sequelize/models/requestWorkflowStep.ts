const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'requestWorkflowStep',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      requestWorkflowId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      label: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      sequence: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      state: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'PENDING',
      },
      attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastError: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      result: {
        type: DataTypes.JSONB,
        allowNull: true,
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
      tableName: 'request_workflow_steps',
      underscored: true,
    },
  );
};

export default init;
