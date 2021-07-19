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
        allowNull: false,
      },
      clientName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      realm: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      publicAccess: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      validRedirectUris: {
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
        defaultValue: false,
      },
      preferredEmail: {
        type: DataTypes.STRING,
        allowNull: true,
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
