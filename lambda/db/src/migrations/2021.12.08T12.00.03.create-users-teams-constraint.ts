import { DataTypes } from 'sequelize';

export const name = '2021.12.08T12.00.03.create-users-teams-constraint.ts';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users_teams', 'user_id');
  await sequelize.getQueryInterface().removeColumn('users_teams', 'team_id');

  await sequelize.getQueryInterface().addColumn('users_teams', 'user_id', {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'users', key: 'id' },
    onDelete: 'CASCADE',
  });

  await sequelize.getQueryInterface().addColumn('users_teams', 'team_id', {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: { model: 'teams', key: 'id' },
    onDelete: 'CASCADE',
  });
};

export const down = async ({ context: sequelize }) => {};

export default { name, up, down };
