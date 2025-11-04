import { Op, DataTypes } from 'sequelize';

export const name = '2022.02.10T09.52.22.convert-user-to-member.js';

export const up = async ({ context: sequelize }) => {
  await sequelize.getQueryInterface().bulkUpdate('users_teams', { role: 'member' }, { role: { [Op.eq]: 'user' } });
};

export const down = async () => {};

export default { name, up, down };
