const init = (sequelize, DataTypes) => {
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
      clientId: {
        type: DataTypes.STRING,
        allowNull: true,
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
      protocol: {
        type: DataTypes.STRING,
        defaultValue: 'oidc',
        allowNull: false,
      },
      authType: {
        type: DataTypes.STRING,
        defaultValue: 'browser-login',
        allowNull: false,
      },
      apiServiceAccount: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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
        type: DataTypes.BIGINT,
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
      githubApproved: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'pr', 'prFailed', 'planned', 'planFailed', 'applied', 'applyFailed'),
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
      lastChanges: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      serviceType: {
        type: DataTypes.STRING,
        defaultValue: 'silver',
        allowNull: false,
      },
      additionalRoleAttribute: {
        type: DataTypes.STRING,
        defaultValue: '',
        allowNull: false,
      },
      devIdps: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      testIdps: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      prodIdps: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      devRoles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      testRoles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      prodRoles: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
      },
      devAssertionLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devAccessTokenLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devOfflineSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devOfflineSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testAssertionLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testAccessTokenLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testOfflineSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      testOfflineSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodAssertionLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodAccessTokenLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodOfflineSessionIdleTimeout: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      prodOfflineSessionMaxLifespan: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      devLoginTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      testLoginTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      prodLoginTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      provisioned: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      provisionedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      userTeamRole: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.getDataValue('userTeamRole');
        },
      },
      devDisplayHeaderTitle: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      testDisplayHeaderTitle: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      prodDisplayHeaderTitle: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      devSamlLogoutPostBindingUri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      testSamlLogoutPostBindingUri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      prodSamlLogoutPostBindingUri: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      devSamlSignAssertions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      testSamlSignAssertions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      prodSamlSignAssertions: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
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

export default init;
