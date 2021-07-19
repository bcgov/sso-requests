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
      realm: {
        type: DataTypes.STRING,
      },
      validRedirectUrls: {
        type: DataTypes.JSONB,
      },
      prNumber: {
        type: DataTypes.INTEGER,
      },
      environments: DataTypes.JSONB,
      projectLead: {
        type: DataTypes.BOOLEAN,
      },
      preferredEmail: {
        type: DataTypes.STRING,
      },
      newToSso: {
        type: DataTypes.BOOLEAN,
      },
      agreeWithTerms: {
        type: DataTypes.BOOLEAN,
      },
      status: {
        type: DataTypes.STRING,
      },
    },
    {
      underscored: true,
    }
  );

  return Request;
};
