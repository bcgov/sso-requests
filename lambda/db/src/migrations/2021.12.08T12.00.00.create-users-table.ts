import { DataTypes } from 'sequelize';

export const name = '2021.12.08T12.00.00.create-users-table.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('users', {
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
    idirEmail: {
      type: DataTypes.STRING,
      field: 'idir_email',
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
  await sequelize.getQueryInterface().dropTable('users');
};

export default { name, up, down };
