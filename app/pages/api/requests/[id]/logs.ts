import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { getAllowedRequest } from '@app/queries/request';
import { fetchLogs } from '@app/controllers/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const isAuth = await authenticate(req, res);
      if (!isAuth) return;
      const { session } = isAuth as { session: Session };
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
        res.status(status).send(data);
      } else {
        res.status(status).send({ message });
      }
    }
  } catch (error) {
    handleError(res, error);
  }
}
