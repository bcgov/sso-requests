import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { listSdxResourceServers } from '@app/controllers/sdx-services';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      if (process.env.NEXT_PUBLIC_INCLUDE_SDX_SERVICES !== 'true') {
        return res.status(403).json({ success: false, message: 'SDX services not enabled' });
      }
      const result = await listSdxResourceServers();
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
