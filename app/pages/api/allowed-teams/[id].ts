import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { getAllowedTeam } from '@app/queries/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id } = req.query;
      const result = await getAllowedTeam(Number(id), session?.user!, { raw: true });
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
