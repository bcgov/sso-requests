import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { deleteOlderThanDate } from '@app/queries/css-api-usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      // get data older than 6 months
      const date = new Date();
      date.setMonth(date.getMonth() - 6);
      await deleteOlderThanDate(date);

      return res.status(200).json({ success: true, message: 'Request processed successfully' });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
