import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { deleteRequest, isAllowedToDeleteIntegration } from '@app/controllers/requests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'DELETE') {
      const { id } = req.query || {};

      const authorized = await isAllowedToDeleteIntegration(session as Session, Number(id));

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to delete this integration' });

      const result = await deleteRequest(session as Session, session?.user!, Number(id));
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
