import { models } from '../../../shared/sequelize/models/models';
import { Session } from '../../../shared/interfaces';
import {
  getAllowedIdpsForApprover,
  isAdmin,
  isBceidApprover,
  isBCServicesCardApprover,
  isGithubApprover,
} from '@lambda-app/utils/helpers';
import { EVENTS } from '@lambda-shared/enums';
import { Op } from 'sequelize';

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
  if (!isAdmin(session) && getAllowedIdpsForApprover(session).length === 0) {
    throw new Error('not allowed');
  }

  const { requestId, eventCode, order = [['createdAt', 'desc']], limit = 100, page = 1, clearNotifications } = data;

  const where: any = { requestId };

  if (eventCode !== 'all') {
    where.eventCode = eventCode;
  }

  const approvedKeys = [];

  if (isBceidApprover(session)) approvedKeys.push('bceidApproved');

  if (isGithubApprover(session)) approvedKeys.push('githubApproved');

  if (isBCServicesCardApprover(session)) approvedKeys.push('bcServicesCardApproved');

  if (approvedKeys.length > 0) {
    where[Op.or] = [
      approvedKeys.map((key) => ({
        details: {
          [Op.contains]: {
            changes: [
              {
                rhs: true,
                kind: 'E',
                path: [key],
              },
            ],
          },
        },
      })),
    ];
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

  return result;
};
