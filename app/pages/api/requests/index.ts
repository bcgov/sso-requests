import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session, User } from '@app/shared/interfaces';
import { handleError, withApiLogging } from '@app/utils/api';
import { processUserSession } from '@app/controllers/user';
import { createRequest, deleteRequest, getRequests, updateRequest } from '@app/controllers/requests';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const { include } = req.query || {};
      const result = await getRequests(session as Session, session?.user as User, include as string);
      return res.status(200).json(result);
    } else if (req.method === 'POST') {
      const result = await createRequest(session as Session, req.body);
      return res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const { submit } = req.query || {};
      const result = await updateRequest(session as Session, req.body, session?.user as User, submit as string);
      return res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      const { id } = req.query || {};
      const result = await deleteRequest(session as Session, session?.user!, Number(id));
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}

export default withApiLogging(handler);
