import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { changeSecret, getInstallation } from '@app/controllers/installation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const result = await getInstallation(session, req.body);
      return res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const result = await changeSecret(session, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
