import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { getAllowedRequest } from '@app/queries/request';
import { fetchLogs } from '@app/controllers/logs';
import { logsRateLimiter } from '@app/utils/rate-limiters';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      await logsRateLimiter(req, res);

      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      const { id } = req.query || {};
      const { start, end, env } = req.query || {};
      const userRequest = await getAllowedRequest(session, Number(id));
      if (!userRequest) {
        return res.status(403).send('forbidden');
      }
      const { status, message, data } = await fetchLogs(
        env as string,
        userRequest.clientId,
        userRequest.id,
        start as string,
        end as string,
        session.idir_userid,
      );
      if (status === 200) {
        res.setHeader('X-Message', message);
        res.setHeader('Content-Length', JSON.stringify(data).length);
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment`);
        return res.status(status).send(data);
      } else {
        return res.status(status).send({ message });
      }
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
