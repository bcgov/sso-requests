import type { NextApiRequest, NextApiResponse } from 'next';
import { sequelize } from '@app/shared/sequelize/models/models';
import { handleError, withApiLogging } from '@app/utils/api';

import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'api/heartbeat' });

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const result = await sequelize.query('SELECT NOW()');
      if (result) return res.status(200).json({ message: result[0] });
      else return res.status(500).json({ message: 'Internal server error' });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (err) {
    log.error({ err }, 'Error in heartbeat API');
    handleError(res, err);
  }
}

export default withApiLogging(handler);
