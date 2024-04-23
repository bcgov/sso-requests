import { DataTypes, Op } from 'sequelize';

export const name = '2024.04.23T00.00.00.add-flag-offline-access-enabled';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_offline_access_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_offline_access_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_offline_access_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  // grandfather existing clients
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { dev_offline_access_enabled: true }, { dev_offline_access_enabled: { [Op.eq]: false } });
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { test_offline_access_enabled: true }, { test_offline_access_enabled: { [Op.eq]: false } });
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { prod_offline_access_enabled: true }, { prod_offline_access_enabled: { [Op.eq]: false } });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_offline_access_enabled');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_offline_access_enabled');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_offline_access_enabled');
};

export default { name, up, down };
