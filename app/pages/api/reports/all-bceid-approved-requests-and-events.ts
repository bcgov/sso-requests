import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { getBceidApprovedRequestsAndEvents } from '@app/controllers/reports';
import { appPermissions, hasAppPermission } from '@app/utils/authorize';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (!hasAppPermission(session?.client_roles, appPermissions.DOWNLOAD_ADMIN_REPORTS)) {
      return res.status(403).json({ success: false, message: 'not allowed' });
    }

    if (req.method === 'GET') {
      const result = await getBceidApprovedRequestsAndEvents();
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
