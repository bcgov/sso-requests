import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { getListOfDescrepencies } from '@app/controllers/requests';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      await getListOfDescrepencies();
      return res.status(200).json({ success: true, message: 'Request processed successfully' });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
