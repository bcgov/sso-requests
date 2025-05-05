import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError, processUserSession } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { restoreTeamServiceAccount } from '@app/controllers/team';
import { assertSessionRole } from '@app/helpers/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const { teamId, saId } = req.query;
      assertSessionRole(session, 'sso-admin');
      const result = await restoreTeamServiceAccount(
        session as Session,
        session?.user?.id!,
        Number(teamId),
        Number(saId),
      );
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
