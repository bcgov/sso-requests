import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { doSkipPrivacyZoneScope } from '@app/queries/custom-requests';
import { processUserSession } from '@app/controllers/user';
import { Session } from '@app/shared/interfaces';
import { authenticate } from '@app/utils/authenticate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      await processUserSession(userSession as Session);

      const { id } = req.query || {};

      return res
        .status(200)
        .json({ success: true, message: await doSkipPrivacyZoneScope(Number.parseInt(id as string)) });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
