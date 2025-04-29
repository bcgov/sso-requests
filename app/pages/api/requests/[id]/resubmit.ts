import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { resubmitRequest } from '@app/controllers/requests';
import createHttpError from 'http-errors';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const isAuth = await authenticate(req, res);
      if (!isAuth) return;
      const { session } = isAuth as { session: Session };
      const { id } = req.query || {};
      if (!id) {
        throw new createHttpError.NotFound('integration ID not found');
      }
      const result = await resubmitRequest(session as Session, Number(id));
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
