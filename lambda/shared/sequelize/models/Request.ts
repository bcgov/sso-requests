module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define('Request', {
    projectName: {
      type: DataTypes.STRING,
      field: 'project_name',
    },
    identityProviders: {
      type: DataTypes.JSONB,
      field: 'identity_providers',
    },
    validRedirectUris: {
      type: DataTypes.JSONB,
      field: 'valid_redirect_uris',
    },
    environments: DataTypes.JSONB,
  });

  return Request;
};
