import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { searchIdirUsers } from '@app/utils/ms-graph-idir';
import { authenticate } from '@app/utils/authenticate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    if (req.method === 'POST') {
      const result = await searchIdirUsers(req.body);
      if (!result) res.status(404).send({ success: false, message: 'No results found' });
      else res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
