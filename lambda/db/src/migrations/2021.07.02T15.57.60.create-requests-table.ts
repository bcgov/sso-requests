const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('requests', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    idirUserid: {
      type: DataTypes.STRING,
      field: 'idir_userid',
      allowNull: false,
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
    prSuccess: {
      type: DataTypes.BOOLEAN,
      field: 'pr_success',
      allowNull: true,
    },
    planSuccess: {
      type: DataTypes.BOOLEAN,
      field: 'plan_success',
      allowNull: true,
    },
    applySuccess: {
      type: DataTypes.BOOLEAN,
      field: 'apply_success',
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    prCreatedAt: {
      type: DataTypes.DATE,
      field: 'pr_created_at',
      allowNull: true,
    },
    planRuntime: {
      type: DataTypes.DATE,
      field: 'plan_runtime',
      allowNull: true,
    },
    applyRuntime: {
      type: DataTypes.DATE,
      field: 'apply_runtime',
      allowNull: true,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('requests');
};
