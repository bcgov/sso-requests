module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define('request', {
    projectName: {
      type: DataTypes.STRING,
      field: 'project_name',
    },
    identityProviders: {
      type: DataTypes.JSONB,
      field: 'identity_providers',
    },
    validRedirectUrls: {
      type: DataTypes.JSONB,
      field: 'valid_redirect_urls',
    },
    prNumber: {
      type: DataTypes.INTEGER,
      field: 'pr_number',
    },
    environments: DataTypes.JSONB,
    success: DataTypes.BOOLEAN,
    prCreatedAt: {
      type: DataTypes.DATE,
      field: 'pr_created_at',
    },
    tfPlanRuntime: {
      type: DataTypes.DATE,
      field: 'tf_plan_runtime',
    },
    tfApplyRuntime: {
      type: DataTypes.DATE,
      field: 'tf_apply_runtime',
    },
  });

  return Request;
};
