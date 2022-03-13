import { DataTypes } from 'sequelize';

export const name = '2022.03.02T10.00.00.allow-idir-userid-null-in-requests-table.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'idirUserid', {
    type: DataTypes.STRING,
    field: 'idir_userid',
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'idirUserid', {
    type: DataTypes.STRING,
    field: 'idir_userid',
    allowNull: false,
  });
};

export default { name, up, down };
