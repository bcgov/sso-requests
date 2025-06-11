import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError, processUserSession } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { addUsersToTeam } from '@app/controllers/team';
import { findAllowedTeamUsers } from '@app/queries/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const { teamId } = req.query;
      const result = await findAllowedTeamUsers(Number(teamId), session?.user?.id!);
      return res.status(200).json(result);
    } else if (req.method === 'POST') {
      const { teamId } = req.query;

      const result = await addUsersToTeam(Number(teamId), session?.user?.id!, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
