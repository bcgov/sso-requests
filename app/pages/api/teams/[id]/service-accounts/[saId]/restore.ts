import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { restoreTeamServiceAccount } from '@app/controllers/team';
import { assertSessionRole } from '@app/helpers/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id: teamId, saId } = req.query;
      assertSessionRole(session, 'sso-admin');
      const result = await restoreTeamServiceAccount(
        session as Session,
        session?.user?.id!,
        Number(teamId),
        Number(saId),
      );
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
