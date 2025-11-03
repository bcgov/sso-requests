import { DataTypes } from 'sequelize';

export const name = '2021.12.18T15.57.90.update-requests-table.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('requests', 'team_id', {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'teams', key: 'id' },
  });
  await sequelize.getQueryInterface().addColumn('requests', 'uses_team', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('requests', 'team_id');
  await sequelize.getQueryInterface().removeColumn('requests', 'uses_team');
};

export default { name, up, down };
