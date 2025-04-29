import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session, User } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { createRequest, getRequests, updateRequest } from '@app/controllers/requests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { include } = req.query || {};
      const result = await getRequests(session as Session, session?.user as User, include as string);
      res.status(200).json(result);
    } else if (req.method === 'POST') {
      const result = await createRequest(session as Session, req.body);
      res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const { submit } = req.query || {};
      const result = await updateRequest(session as Session, req.body, session?.user as User, submit as string);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
