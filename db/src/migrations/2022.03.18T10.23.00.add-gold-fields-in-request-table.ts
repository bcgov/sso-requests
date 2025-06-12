import { DataTypes } from 'sequelize';

export const name = '2022.03.18T10.23.00.add-gold-fields-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'service_type', {
    type: DataTypes.STRING,
    defaultValue: 'silver',
    allowNull: false,
  });
  await sequelize.getQueryInterface().bulkUpdate('requests', { service_type: 'silver' }, { service_type: null });

  await sequelize.getQueryInterface().addColumn('requests', 'dev_idps', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_idps', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_idps', {
    type: DataTypes.ARRAY(DataTypes.STRING),
    defaultValue: [],
    allowNull: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'service_type');
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_idps');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_idps');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_idps');
};

export default { name, up, down };
