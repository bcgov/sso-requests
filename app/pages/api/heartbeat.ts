import type { NextApiRequest, NextApiResponse } from 'next';
import { sequelize } from '@app/shared/sequelize/models/models';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const result = await sequelize.query('SELECT NOW()');
  if (result) res.status(200).json({ message: result[0] });
  else res.status(500).json({ message: 'Internal server error' });
}
