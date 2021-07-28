const { DataTypes } = require('sequelize');

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
    planDetails: {
      type: DataTypes.JSONB,
      field: 'plan_details',
      allowNull: true,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('events');
};
