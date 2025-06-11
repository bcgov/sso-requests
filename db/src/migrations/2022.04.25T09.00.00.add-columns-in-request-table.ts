import { DataTypes } from 'sequelize';

export const name = '2022.04.25T09.00.00.add-columns-in-request-table';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'client_id', {
    type: DataTypes.STRING,
    allowNull: true,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'provisioned', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().addColumn('requests', 'provisioned_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'client_id');
  await sequelize.getQueryInterface().removeColumn('requests', 'provisioned');
  await sequelize.getQueryInterface().removeColumn('requests', 'provisioned_at');
};

export default { name, up, down };
