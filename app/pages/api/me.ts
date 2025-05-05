import type { NextApiRequest, NextApiResponse } from 'next';
import { findMyOrTeamIntegrationsByService } from '@app/queries/request';
import { updateProfile } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const integrations = await findMyOrTeamIntegrationsByService(session?.user?.id as number);
      return res.status(200).json({ ...session?.user, integrations });
    } else if (req.method === 'POST') {
      const result = await updateProfile(session, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
