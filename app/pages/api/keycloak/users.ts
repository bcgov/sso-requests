import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { searchKeycloakUsers } from '@app/controllers/keycloak';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'POST') {
      const result = await searchKeycloakUsers(session as Session, req.body);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
