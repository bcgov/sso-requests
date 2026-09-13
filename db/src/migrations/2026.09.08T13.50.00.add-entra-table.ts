import { DataTypes } from 'sequelize';

export const name = '2026.09.08T13.50.00.add-entra-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('entra_clients', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    app_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    app_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    secret: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    service_principal_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    secret_expiry_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    environment: {
      type: DataTypes.TEXT,
      allowNull: false,
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

  await sequelize.getQueryInterface().addConstraint('entra_clients', {
    fields: ['request_id', 'environment'],
    type: 'unique',
    name: 'entra_clients_request_id_environment_unique',
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('entra_clients');
  await sequelize.getQueryInterface().removeConstraint('entra_clients', 'entra_clients_request_id_environment_unique');
};

export default { name, up, down };
