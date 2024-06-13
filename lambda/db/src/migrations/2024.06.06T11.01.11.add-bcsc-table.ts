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
      allowNull: true,
    },
    client_secret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    registration_access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    privacy_zone_uri: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    client_name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    claims: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    scopes: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: false,
      defaultValue: [],
    },
    created: {
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
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('bcsc_clients');
};

export default { name, up, down };
