import type { NextApiRequest, NextApiResponse } from 'next';
import createHttpError from 'http-errors';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, withApiLogging } from '@app/utils/api';
import { processUserSession } from '@app/controllers/user';
import { stopRequestWorkflow } from '@app/controllers/requests';

/** Admin only: ends an integration's in-progress workflow as failed so it can be resubmitted once fixed. */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      const id = Number(req.query?.id);
      if (!id) throw new createHttpError.NotFound('integration ID not found');

      return res.status(200).json(await stopRequestWorkflow(session as Session, id));
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}

export default withApiLogging(handler);
