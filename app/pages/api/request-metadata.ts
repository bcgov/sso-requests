import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { updateRequestMetadata } from '@app/controllers/requests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'PUT') {
      const isAuth = await authenticate(req, res);
      if (!isAuth) return;
      const { session } = isAuth as { session: Session };
      const result = await updateRequestMetadata(session as Session, session?.user!, req.body);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
