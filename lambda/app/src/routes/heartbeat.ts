import { sequelize } from '../../../shared/sequelize/models/models';

export const wakeUpAll = async () => {
  const result = await sequelize.query('SELECT NOW()');
  return result && result[0];
};
