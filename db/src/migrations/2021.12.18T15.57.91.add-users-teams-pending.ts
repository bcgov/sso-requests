import { DataTypes } from 'sequelize';

export const name = '2021.12.18T15.57.91.add-users-teams-pending.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().addColumn('users_teams', 'pending', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().removeColumn('users_teams', 'pending');
};

export default { name, up, down };
