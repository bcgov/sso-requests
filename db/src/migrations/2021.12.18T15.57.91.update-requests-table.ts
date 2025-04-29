import { Op, DataTypes } from 'sequelize';

export const name = '2021.12.18T15.57.91.update-requests-table.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('requests', { uses_team: false }, { uses_team: { [Op.eq]: null } });
  await sequelize.getQueryInterface().changeColumn('requests', 'uses_team', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().changeColumn('requests', 'uses_team', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  });
};

export default { name, up, down };
