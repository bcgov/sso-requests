import sequelize from '../sequelize/config';

export const wakeUpAll = async () => {
  const result = await sequelize.query('SELECT NOW()');
  return result && result[0];
};
