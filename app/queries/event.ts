import { models } from '@app/shared/sequelize/models/models';
import { Event } from '@app/interfaces/Event';

export const createEvent = async (data: Event) => {
  try {
    await models.event.create(data);
  } catch (err) {
    console.log(err);
  }
};
