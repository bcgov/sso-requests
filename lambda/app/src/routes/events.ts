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
    eventCode: string;
    clearNotifications?: boolean;
    order?: any;
    limit?: number;
    page?: number;
  },
) => {
  const { requestId, eventCode, order = [['createdAt', 'desc']], limit = 100, page = 1, clearNotifications } = data;

  try {
    const where: any = { requestId };

    if (eventCode !== 'all') {
      where.eventCode = eventCode;
    }

    const result: Promise<{ count: number; rows: any[] }> = await models.event.findAndCountAll({
      where,
      limit,
      offset: page > 0 ? (page - 1) * limit : 0,
      order,
    });

    if (clearNotifications)
      await models.request.update(
        { hasUnreadNotifications: false },
        {
          where: { id: requestId },
        },
      );

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    handleError(err);
  }
};
