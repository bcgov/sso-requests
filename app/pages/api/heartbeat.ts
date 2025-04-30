import type { NextApiRequest, NextApiResponse } from 'next';
import { sequelize } from '@app/shared/sequelize/models/models';
import { handleError } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const result = await sequelize.query('SELECT NOW()');
      if (result) res.status(200).json({ message: result[0] });
      else res.status(500).json({ message: 'Internal server error' });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    handleError(res, err);
  }
}
