import { DataTypes } from 'sequelize';

export const name = '2024.01.10T00.00.00.update-request-roles-table';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('request_roles', 'created_by', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await sequelize.getQueryInterface().changeColumn('request_roles', 'last_updated_by', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('request_roles', 'created_by', {
    type: DataTypes.INTEGER,
    allowNull: false,
  });
  await sequelize.getQueryInterface().changeColumn('request_roles', 'last_updated_by', {
    type: DataTypes.INTEGER,
    allowNull: false,
  });
};

export default { name, up, down };
