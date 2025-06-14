import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteStaleUsers } from '@app/controllers/user';
import { handleError } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }
      const result = await deleteStaleUsers(req.body);
      if (result) return res.status(200).json({ success: true });
      else return res.status(404).json({ success: false, message: 'user not found' });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    handleError(res, err);
  }
}
