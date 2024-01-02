import { DataTypes } from 'sequelize';

export const name = '2023.12.25T01.00.00.create-request-roles-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('request_roles', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    environment: {
      type: DataTypes.STRING,
      allowNull: false,
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
    requestId: {
      type: DataTypes.INTEGER,
      references: { model: 'requests', key: 'id' },
      field: 'request_id',
      allowNull: false,
    },
    composite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    composite_roles: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      defaultValue: [],
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by',
      allowNull: false,
    },
    lastUpdatedBy: {
      type: DataTypes.INTEGER,
      field: 'last_updated_by',
      allowNull: false,
    },
  });

  await sequelize.getQueryInterface().addIndex('request_roles', {
    fields: ['name', 'environment', 'request_id'],
    unique: true,
    type: 'UNIQUE',
    name: 'unique_name_env_requestid',
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeIndex('request_roles', 'unique_name_env_requestid');
  await sequelize.getQueryInterface().dropTable('request_queues');
};

export default { name, up, down };
