import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { updateRequestMetadata } from '@app/controllers/requests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'PUT') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      const result = await updateRequestMetadata(session as Session, session?.user!, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
