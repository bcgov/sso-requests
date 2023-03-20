import { DataTypes, Op } from 'sequelize';

export const name = '2022.12.01T13:36.60.add-flag-loginpage-header-title';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'dev_display_header_title', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_display_header_title', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_display_header_title', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });

  // Update existing rows
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { dev_display_header_title: true }, { dev_display_header_title: { [Op.eq]: null } });
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { test_display_header_title: true }, { test_display_header_title: { [Op.eq]: null } });
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { prod_display_header_title: true }, { prod_display_header_title: { [Op.eq]: null } });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_display_header_title');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_display_header_title');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_display_header_title');
};

export default { name, up, down };
