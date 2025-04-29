import { DataTypes } from 'sequelize';

export const name = '2021.07.01T15.57.60.create-requests-table.js';

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
    clientName: {
      type: DataTypes.STRING,
      field: 'client_name',
      allowNull: true,
    },
    realm: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    publicAccess: {
      type: DataTypes.BOOLEAN,
      field: 'public_access',
      allowNull: false,
      defaultValue: false,
    },
    devValidRedirectUris: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'dev_valid_redirect_uris',
      allowNull: false,
      defaultValue: [],
    },
    testValidRedirectUris: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'test_valid_redirect_uris',
      allowNull: false,
      defaultValue: [],
    },
    prodValidRedirectUris: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'prod_valid_redirect_uris',
      allowNull: false,
      defaultValue: [],
    },
    environments: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    },
    prNumber: {
      type: DataTypes.INTEGER,
      field: 'pr_number',
      allowNull: true,
    },
    actionNumber: {
      type: DataTypes.INTEGER,
      field: 'action_number',
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
    projectLead: {
      type: DataTypes.BOOLEAN,
      field: 'project_lead',
      allowNull: true,
      defaultValue: false,
    },
    preferredEmail: {
      type: DataTypes.STRING,
      field: 'preferred_email',
      allowNull: true,
    },
    newToSso: {
      type: DataTypes.BOOLEAN,
      field: 'new_to_sso',
      allowNull: true,
      defaultValue: false,
    },
    agreeWithTerms: {
      type: DataTypes.BOOLEAN,
      field: 'agree_with_terms',
      allowNull: true,
      defaultValue: false,
    },
    bceidApproved: {
      type: DataTypes.BOOLEAN,
      field: 'bceid_approved',
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
        'applyFailed',
      ),
      defaultValue: 'draft',
      allowNull: false,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('requests');
};

export default { name, up, down };
