import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authorizeIntegration } from '@app/queries/integrationAccess';
import { getIntegrationProgress } from '@app/workflow/request-workflow';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    const { id } = req.query || {};

    // Reuse the integration authorization rules so progress is only visible to the owning user,
    // their team, or an admin.
    const authorized = await authorizeIntegration(session, Number(id), 'integrations:read');
    if (!authorized) return res.status(404).json({ success: false, message: 'integration not found' });

    const progress = await getIntegrationProgress(Number(id));
    return res.status(200).json(progress);
  } catch (error) {
    handleError(res, error);
  }
}
