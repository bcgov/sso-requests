import type { NextApiRequest, NextApiResponse } from 'next';
import { findMyOrTeamIntegrationsByService } from '@app/queries/request';
import { updateProfile } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const integrations = await findMyOrTeamIntegrationsByService(session?.user?.id as number);
      res.status(200).json({ ...req.body?.user, integrations });
    } else if (req.method === 'POST') {
      const result = await updateProfile(session, req.body);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
