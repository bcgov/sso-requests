import { models } from '@app/shared/sequelize/models/models';
import { Session } from '@app/shared/interfaces';
import {
  getAllowedIdpsForApprover,
  isBceidApprover,
  isBcServicesCardApprover,
  isGithubApprover,
  isOTPApprover,
} from '@app/utils/helpers';
import { Op } from 'sequelize';
import { isSocialApprover } from '@app/utils/helpers';
import { hasAppPermission, appPermissions } from '@app/utils/authorize';
import { getAllowedRequest } from '@app/queries/request';
import { EVENTS } from '@app/shared/enums';
import createHttpError from 'http-errors';

/**
 * Fetch request update events for the given user session and request id. If user does not own integration throws 403.
 * @param session
 * @param requestId
 * @returns Promise<{count: number, rows: Event[]}>
 */
export const getRequestScopedEvents = async (session: Session, requestId: string) => {
  const authorized = await getAllowedRequest(session, Number(requestId));
  if (!authorized) throw new createHttpError.Forbidden('User is not authorized to view request events');

  return models.event.findAndCountAll({
    where: { requestId, eventCode: EVENTS.REQUEST_UPDATE_SUCCESS },
    order: [['createdAt', 'desc']],
  });
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
  if (
    !hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS) &&
    !hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS)
  ) {
    throw new Error('User is not authorized to view request events');
  }

  const { requestId, eventCode, order = [['createdAt', 'desc']], limit = 100, page = 1, clearNotifications } = data;

  const where: any = { requestId };

  if (eventCode !== 'all') {
    where.eventCode = eventCode;
  }

  if (!hasAppPermission(session?.client_roles, appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS)) {
    const approvedKeys = [];

    if (isBceidApprover(session)) approvedKeys.push('devBceidApproved', 'testBceidApproved', 'bceidApproved');

    if (isGithubApprover(session)) approvedKeys.push('githubApproved');

    if (isOTPApprover(session)) approvedKeys.push('otpApproved');

    if (isBcServicesCardApprover(session)) approvedKeys.push('bcServicesCardApproved');

    if (isSocialApprover(session)) approvedKeys.push('socialApproved');

    if (approvedKeys.length > 0) {
      where[Op.or] = approvedKeys.map((key) => ({
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
      }));
    }
  }

  const result: { count: number; rows: any[] } = await models.event.findAndCountAll({
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
