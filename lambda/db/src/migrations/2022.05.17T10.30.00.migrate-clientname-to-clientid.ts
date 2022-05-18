import { DataTypes, Op } from 'sequelize';

export const name = '2022.05.17T10.30.00.migrate-clientname-to-clientid';

export const up = async ({ context: sequelize }) => {
  console.log('sequelize', Object.keys(sequelize));
  // migrate values from `client_name` to `client_id`
  await sequelize
    .getQueryInterface()
    .bulkUpdate('requests', { client_id: sequelize.col('client_name') }, { client_name: { [Op.ne]: null } });

  await sequelize.getQueryInterface().bulkUpdate('requests', { client_name: null }, {});

  await sequelize.getQueryInterface().addColumn('requests', 'dev_login_title', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'test_login_title', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'prod_login_title', {
    type: DataTypes.STRING,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'dev_login_title');
  await sequelize.getQueryInterface().removeColumn('requests', 'test_login_title');
  await sequelize.getQueryInterface().removeColumn('requests', 'prod_login_title');
};

export default { name, up, down };
