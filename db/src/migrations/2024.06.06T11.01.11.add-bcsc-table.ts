import { DataTypes } from 'sequelize';

export const name = '2024.06.06T11.01.11.add-bcsc-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('bcsc_clients', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    client_id: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    client_secret: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    registration_access_token: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    environment: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    client_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    archived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    request_id: {
      type: DataTypes.INTEGER,
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
  });

  await sequelize.getQueryInterface().addConstraint('bcsc_clients', {
    fields: ['request_id', 'environment'],
    type: 'unique',
  });

  await sequelize.getQueryInterface().addColumn('requests', 'bcsc_privacy_zone', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'dev_home_page_uri', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_home_page_uri', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_home_page_uri', {
    type: DataTypes.TEXT,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'bcsc_attributes', {
    type: DataTypes.ARRAY(DataTypes.TEXT),
    allowNull: false,
    defaultValue: [],
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('bcsc_clients');
  await sequelize.getQueryInterface().removeColumn('requests', 'bcsc_privacy_zone');
  await sequelize.getQueryInterface().removeColumn('requests', 'bcsc_attributes');
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_home_page_uri');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_home_page_uri');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_home_page_uri');
};

export default { name, up, down };
