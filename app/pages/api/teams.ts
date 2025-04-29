import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { createTeam, listTeams } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method == 'GET') {
      const result = await listTeams(session?.user!);
      res.status(200).json(result);
    } else if (req.method === 'POST') {
      const result = await createTeam(session?.user!, req.body);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
