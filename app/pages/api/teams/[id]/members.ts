import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { addUsersToTeam } from '@app/controllers/team';
import { findAllowedTeamUsers } from '@app/queries/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id } = req.query;
      const result = await findAllowedTeamUsers(Number(id), session?.user?.id!);
      res.status(200).json(result);
    } else if (req.method === 'POST') {
      const { id } = req.query;
      const result = await addUsersToTeam(Number(id), session?.user?.id!, req.body);
      res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
