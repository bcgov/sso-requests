import { DataTypes } from 'sequelize';

export const name = '2021.12.08T12.00.02.create-users-teams-table.js';

// see https://sequelize.org/master/manual/naming-strategies.html
export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().createTable('users_teams', {
    userId: {
      type: DataTypes.INTEGER,
      field: 'user_id',
      primaryKey: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE',
    },
    teamId: {
      type: DataTypes.INTEGER,
      field: 'team_id',
      primaryKey: true,
      references: { model: 'teams', key: 'id' },
      onDelete: 'CASCADE',
    },
    role: {
      type: DataTypes.STRING,
      field: 'role',
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at',
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });
};

export const down = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().dropTable('users_teams');
};

export default { name, up, down };
