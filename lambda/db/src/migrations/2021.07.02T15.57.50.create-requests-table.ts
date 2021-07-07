const { DataTypes } = require('sequelize');

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('requests', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    projectName: {
      type: DataTypes.STRING,
      field: 'project_name',
      allowNull: false,
    },
    identityProviders: {
      type: DataTypes.JSONB,
      field: 'identity_providers',
      allowNull: false,
    },
    validRedirectUrls: {
      type: DataTypes.JSONB,
      field: 'valid_redirect_urls',
      allowNull: false,
    },
    environments: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('requests');
};
