import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { fetchMetrics } from '@app/controllers/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      const { id } = req.query || {};
      const { fromDate, toDate, env } = req.query || {};
      const { status, message, data } = await fetchMetrics(
        session,
        Number(id),
        env as string,
        fromDate as string,
        toDate as string,
      );
      if (status === 200) return res.status(status).send(data);
      else return res.status(status).send({ message });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
