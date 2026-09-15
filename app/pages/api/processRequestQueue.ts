import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { drainSagas } from '@app/saga/orchestrator';

/**
 * Recovery tick for the integration saga orchestrator.
 *
 * Sagas are normally started in-process by the pod that accepted the submission. This endpoint is
 * the crash-recovery path: it re-claims sagas whose owner died mid-flight (expired lease), sagas
 * waiting out a retry backoff window, and sagas that were persisted but never started.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      const { processed } = await drainSagas();
      return res.status(200).json({ success: true, processed });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
