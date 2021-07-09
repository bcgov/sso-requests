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
    prSuccess: {
      type: DataTypes.STRING,
      field: 'pr_success',
    },
    planSuccess: {
      type: DataTypes.STRING,
      field: 'plan_success',
    },
    applySuccess: {
      type: DataTypes.STRING,
      field: 'apply_success',
    },
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
