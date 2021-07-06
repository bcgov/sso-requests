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
    environments: DataTypes.JSONB,
  });

  return Request;
};
