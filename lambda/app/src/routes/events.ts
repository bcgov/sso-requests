import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';

const handleError = (err: string) => {
  console.error(err);
  return {
    statusCode: 422,
  };
};

export const getEvents = async (
  session: Session,
  data: {
    requestId: string;
    eventType: string;
    order?: any;
    limit?: number;
    page?: number;
  },
) => {
  const { requestId, eventType, order = [['createdAt', 'desc']], limit = 100, page = 1 } = data;

  try {
    const where: any = { requestId };

    if (eventType !== 'all') {
      where.eventType = eventType;
    }

    const result: Promise<{ count: number; rows: any[] }> = await models.event.findAndCountAll({
      where,
      limit,
      offset: page > 0 ? (page - 1) * limit : 0,
      order,
    });

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    handleError(err);
  }
};
