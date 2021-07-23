import { sequelize } from '../../../shared/sequelize/models/models';

const handleError = (err: string) => {
  console.error(err);
  return {
    statusCode: 422,
  };
};

export const wakeUpAll = async () => {
  try {
    const result = await sequelize.query('SELECT NOW()');
    return { statusCode: 200, body: JSON.stringify(result && result[0]) };
  } catch (err) {
    handleError(err);
  }
};
