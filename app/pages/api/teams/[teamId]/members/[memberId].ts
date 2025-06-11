import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError, processUserSession } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { removeUserFromTeam, updateMemberInTeam } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'PUT') {
      const { teamId, memberId } = req.query;
      const result = await updateMemberInTeam(session?.user?.id!, Number(teamId), Number(memberId), req.body);
      return res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      const { teamId, memberId } = req.query;
      const result = await removeUserFromTeam(session?.user?.id!, Number(memberId), Number(teamId));
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error in team member handler:', error);
    handleError(res, error);
  }
}
