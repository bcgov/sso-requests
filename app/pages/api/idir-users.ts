import type { NextApiRequest, NextApiResponse } from 'next';
import { searchIdirEmail } from '@app/utils/ms-graph-idir';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    if (req.method !== 'GET') {
      const { email } = req.query;
      if (!email) {
        res.status(400).send('Must include email query parameter');
        return;
      }
      const result = await searchIdirEmail(email as string);
      res.status(200).send(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
