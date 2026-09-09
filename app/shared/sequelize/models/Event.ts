const init = (sequelize: any, DataTypes: any) => {
  return sequelize.define(
    'event',
    {
      requestId: {
        type: DataTypes.INTEGER,
        references: { model: 'requests', key: 'id' },
        allowNull: true,
      },
      eventCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      details: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      idirUserDisplayName: {
        type: DataTypes.STRING,
        field: 'idir_user_display_name',
      },
      organizationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'organization_id',
      },
      // Machine actors have no idir_userid, so this is what distinguishes one
      // API account's actions from another's in the log.
      apiClientId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'api_client_id',
      },
    },
    {
      underscored: true,
    },
  );
};

export default init;
