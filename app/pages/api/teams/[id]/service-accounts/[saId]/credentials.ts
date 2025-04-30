import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { getServiceAccountCredentials, updateServiceAccountSecret } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id: teamId, saId } = req.query;
      const result = await getServiceAccountCredentials(session?.user?.id!, Number(teamId), Number(saId));
      res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const { id: teamId, saId } = req.query;
      const result = await updateServiceAccountSecret(session?.user?.id!, Number(teamId), Number(saId));
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
