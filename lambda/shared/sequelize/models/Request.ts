module.exports = (sequelize, DataTypes) => {
  const Request = sequelize.define(
    'request',
    {
      idirUserid: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      projectName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      realm: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      validRedirectUrls: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      prNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      environments: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      projectLead: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      preferredEmail: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      newToSso: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      agreeWithTerms: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM,
        values: ['draft', 'pending', 'submitted', 'approved', 'completed'],
        defaultValue: 'draft',
        allowNull: false,
      },
    },
    {
      underscored: true,
    }
  );

  return Request;
};
