import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { removeUserFromTeam, updateMemberInTeam } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'PUT') {
      const { id, memberId } = req.query;
      const result = await updateMemberInTeam(session?.user?.id!, Number(id), Number(memberId), req.body);
      res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      const { id, memberId } = req.query;
      const result = await removeUserFromTeam(session?.user?.id!, Number(memberId), Number(id));
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
