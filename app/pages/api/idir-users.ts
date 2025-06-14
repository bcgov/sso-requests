import type { NextApiRequest, NextApiResponse } from 'next';
import { searchIdirEmail } from '@app/utils/ms-graph-idir';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    if (req.method === 'GET') {
      const { email } = req.query;
      if (!email) {
        return res.status(400).send('Must include email query parameter');
        return;
      }
      const result = await searchIdirEmail(email as string);
      return res.status(200).send(result);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
