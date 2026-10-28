const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'event',
    {
      requestId: {
        type: DataTypes.INTEGER,
        references: { model: 'requests', key: 'id' },
        allowNull: true,
      },
      teamId: {
        type: DataTypes.INTEGER,
        references: { model: 'teams', key: 'id' },
        onDelete: 'SET NULL',
        allowNull: true,
        field: 'team_id',
      },
      workflowId: {
        type: DataTypes.UUID,
        references: { model: 'request_workflows', key: 'id' },
        onDelete: 'SET NULL',
        allowNull: true,
        field: 'workflow_id',
      },
      eventCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      actorType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'user',
        field: 'actor_type',
      },
      actorId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'actor_id',
      },
      // Organization events have no request to hang from, so they are recorded
      // against the organization instead.
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'organization_id',
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      idirUserDisplayName: {
        type: DataTypes.STRING,
        field: 'idir_user_display_name',
      },
    },
    {
      underscored: true,
    },
  );
};

export default init;
