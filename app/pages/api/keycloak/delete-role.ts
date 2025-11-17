import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { deleteRoles } from '@app/controllers/roles';
import { isAllowedToManageRoles } from '@app/controllers/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const authorized = await isAllowedToManageRoles(session as Session, req.body.integrationId);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to delete role' });

      const result = await deleteRoles(session?.user?.id!, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
