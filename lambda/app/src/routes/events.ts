import { models } from '../../../shared/sequelize/models/models';

const handleError = (err: string) => {
  console.error(err);
  return {
    statusCode: 422,
  };
};

export const getEvents = async () => {
  try {
    const events = await models.event.findAll();
    return {
      statusCode: 200,
      body: JSON.stringify(events),
    };
  } catch (err) {
    handleError(err);
  }
};
