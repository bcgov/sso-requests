import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { drainWorkflows } from '@app/workflow/orchestrator';

/**
 * Recovery tick for the integration workflow orchestrator.
 *
 * Workflows are normally started in-process by the pod that accepted the submission. This endpoint is
 * the crash-recovery path: it re-claims workflows whose owner died mid-flight (expired lease), workflows
 * waiting out a retry backoff window, and workflows that were persisted but never started.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const { Authorization, authorization } = req.headers || {};
      const authHeader = Authorization || authorization;
      if (!authHeader || authHeader !== process.env.API_AUTH_SECRET) {
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      const { processed } = await drainWorkflows();
      return res.status(200).json({ success: true, processed });
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
