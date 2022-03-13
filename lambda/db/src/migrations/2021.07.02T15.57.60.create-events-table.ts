import { DataTypes } from 'sequelize';

export const name = '2021.07.02T15.57.60.create-events-table.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('events', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
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
      allowNull: true,
    },
    eventCode: {
      type: DataTypes.STRING,
      field: 'event_code',
      allowNull: false,
    },
    idirUserid: {
      type: DataTypes.STRING,
      field: 'idir_userid',
      allowNull: true,
    },
    details: {
      type: DataTypes.JSONB,
      field: 'details',
      allowNull: true,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('events');
};

export default { name, up, down };
