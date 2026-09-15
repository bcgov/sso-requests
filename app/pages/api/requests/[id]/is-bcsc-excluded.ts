import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { doSkipPrivacyZoneScope } from '@app/queries/custom-requests';
import { processUserSession } from '@app/controllers/user';
import { Session } from '@app/shared/interfaces';
import { authenticate } from '@app/utils/authenticate';
import { authorizeIntegration } from '@app/queries/integrationAccess';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      const { id } = req.query || {};
      const requestId = Number(id);
      if (!Number.isFinite(requestId)) {
        return res.status(400).json({ success: false, message: 'invalid request id' });
      }

      const authorized = await authorizeIntegration(session, requestId, 'integrations:read');
      if (!authorized) {
        return res.status(403).send('forbidden');
      }

      return res.status(200).json({ success: true, message: await doSkipPrivacyZoneScope(requestId) });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
