import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { fetchMetrics } from '@app/controllers/logs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const isAuth = await authenticate(req, res);
      if (!isAuth) return;
      const { session } = isAuth as { session: Session };
      const { id } = req.query || {};
      const { fromDate, toDate, env } = req.query || {};
      const { status, message, data } = await fetchMetrics(
        session,
        Number(id),
        env as string,
        fromDate as string,
        toDate as string,
      );
      if (status === 200) res.status(status).send(data);
      else res.status(status).send({ message });
    }
  } catch (error) {
    handleError(res, error);
  }
}
