// The audit record. Columns match AUDIT_EVENT_COLUMNS in @sso/audit, which
// writes every row. None of the resource columns carries a foreign key, so an
// event outlives the request, team or organization it is about.
const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'event',
    {
      eventCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      outcome: {
        type: DataTypes.STRING(16),
        allowNull: false,
        defaultValue: 'success',
      },
      operationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      parentOperationId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      requestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      teamId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // Organization events have no request to hang from, so they are recorded
      // against the organization instead.
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      workflowId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      targetType: {
        type: DataTypes.STRING(32),
        allowNull: true,
      },
      targetId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      environment: {
        type: DataTypes.STRING(16),
        allowNull: true,
      },
      actorType: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'user',
      },
      actorId: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      idirUserDisplayName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      reqId: {
        type: DataTypes.STRING(64),
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      underscored: true,
    },
  );
};

export default init;
