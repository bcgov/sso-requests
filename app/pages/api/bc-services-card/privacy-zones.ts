import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { getPrivacyZones } from '@app/controllers/bc-services-card';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    if (req.method === 'GET') {
      const result = await getPrivacyZones();
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
