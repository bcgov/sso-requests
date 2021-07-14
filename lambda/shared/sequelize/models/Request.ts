module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define(
    'request',
    {
      idirUserid: {
        type: DataTypes.STRING,
      },
      projectName: {
        type: DataTypes.STRING,
      },
      identityProviders: {
        type: DataTypes.JSONB,
      },
      validRedirectUrls: {
        type: DataTypes.JSONB,
      },
      prNumber: {
        type: DataTypes.INTEGER,
      },
      environments: DataTypes.JSONB,
      prSuccess: {
        type: DataTypes.STRING,
      },
      planSuccess: {
        type: DataTypes.STRING,
      },
      applySuccess: {
        type: DataTypes.STRING,
      },
      prCreatedAt: {
        type: DataTypes.DATE,
      },
      planRuntime: {
        type: DataTypes.DATE,
      },
      applyRuntime: {
        type: DataTypes.DATE,
      },
      projectLead: {
        type: DataTypes.BOOLEAN,
      },
      preferredEmail: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );

  return Request;
};
