import { DataTypes } from 'sequelize';

export const name = '2021.08.20T15.57.60.update-requests-table.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'archived', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });

  await sequelize.getQueryInterface().changeColumn('requests', 'publicAccess', {
    type: DataTypes.BOOLEAN,
    field: 'public_access',
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'archived');
  await sequelize.getQueryInterface().changeColumn('requests', 'publicAccess', {
    type: DataTypes.BOOLEAN,
    field: 'public_access',
    allowNull: false,
    defaultValue: false,
  });
};

export default { name, up, down };
