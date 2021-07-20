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
      actionNumber: {
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
        type: DataTypes.ENUM(
          'draft',
          'submitted',
          'pr',
          'prFailed',
          'planned',
          'planFailed',
          'approved',
          'applied',
          'applyFailed'
        ),
        // End-user's perspective
        // values: [
        //   'draft',
        //   'submitted',
        //   'in review',
        //   'technical issue',
        //   'completed',
        // ],
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
