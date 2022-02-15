const { DataTypes, Op } = require('sequelize');

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('users_teams', { role: 'member' }, { role: { [Op.eq]: 'user' } });
};

export const down = async () => {};
