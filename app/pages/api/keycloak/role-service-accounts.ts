import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, withApiLogging } from '@app/utils/api';
import { processUserSession } from '@app/controllers/user';
import { listServiceAccountsByRole } from '@app/controllers/user';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const result = await listServiceAccountsByRole(session as Session, req.body);
      return res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}

export default withApiLogging(handler);
