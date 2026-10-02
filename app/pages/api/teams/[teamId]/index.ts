import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError, withApiLogging } from '@app/utils/api';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { deleteTeam, updateTeam } from '@app/controllers/team';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'PUT') {
      const { teamId } = req.query;
      const result = await updateTeam(session as Session, teamId as string, req.body);
      return res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      const { teamId } = req.query;
      const result = await deleteTeam(session as Session, Number(teamId));
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}

export default withApiLogging(handler);
