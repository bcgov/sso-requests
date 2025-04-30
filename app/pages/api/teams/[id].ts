import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { deleteTeam, updateTeam } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id } = req.query;
      const result = await updateTeam(session?.user!, id as string, req.body);
      res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      const { id } = req.query;
      const result = await deleteTeam(session as Session, Number(id));
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
