import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { listClientRolesByUsers, updateUserRoleMappings } from '@app/controllers/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'POST') {
      const result = await listClientRolesByUsers(session?.user?.id!, req.body);
      res.status(200).json(result);
    } else if (req.method === 'PUT') {
      const result = await updateUserRoleMappings(session?.user?.id!, req.body);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
