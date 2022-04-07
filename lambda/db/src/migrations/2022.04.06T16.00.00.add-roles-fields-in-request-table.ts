import { DataTypes } from 'sequelize';

export const name = '2022.04.06T16.00.00.add-roles-fields-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('requests', { service_type: 'silver' }, { service_type: null });

  await sequelize.getQueryInterface().addColumn('requests', 'dev_roles', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_roles', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_roles', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_roles');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_roles');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_roles');
};

export default { name, up, down };
