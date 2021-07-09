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
    prNumber: {
      type: DataTypes.INTEGER,
      field: 'pr_number',
      allowNull: true,
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
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
    prCreatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'pr_created_at',
    },
    tfPlanRuntime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'tf_plan_runtime',
    },
    tfApplyRuntime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'tf_apply_runtime',
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('requests');
};
