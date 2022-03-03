module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define(
    'request',
    {
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      projectName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      realm: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      publicAccess: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      devValidRedirectUris: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      testValidRedirectUris: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      prodValidRedirectUris: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      prNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      actionNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      environments: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      projectLead: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      newToSso: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      agreeWithTerms: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      bceidApproved: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM(
          'draft',
          'submitted',
          'pr',
          'prFailed',
          'planned',
          'planFailed',
          'approved',
          'applied',
          'applyFailed',
        ),
        defaultValue: 'draft',
        allowNull: false,
      },
      archived: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      idirUserDisplayName: {
        type: DataTypes.STRING,
        field: 'idir_user_display_name',
      },
      hasUnreadNotifications: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'has_unread_notifications',
      },
      browserFlowOverride: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'browser_flow_override',
      },
      usesTeam: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: 'uses_team',
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'user_id',
      },
      teamId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: 'team_id',
      },
      requester: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      underscored: true,
      associate: function (models) {
        Request.belongsTo(models.team);
        Request.belongsTo(models.user);
      },
    },
  );

  return Request;
};
