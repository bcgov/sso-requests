import { models } from '@app/shared/sequelize/models/models';
import { Event } from '@app/interfaces/Event';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'queries/event' });

export const createEvent = async (data: Event) => {
  try {
    await models.event.create(data);
  } catch (err) {
    log.error({ err }, 'createEvent failed');
  }
};
