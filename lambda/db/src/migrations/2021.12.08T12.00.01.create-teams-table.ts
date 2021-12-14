const { DataTypes } = require('sequelize');

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('teams', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      defaultValue: sequelize.UUIDV4,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      field: 'name',
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
  await sequelize.getQueryInterface().dropTable('teams');
};
