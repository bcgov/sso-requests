import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { isAllowedToManageRoles } from '@app/controllers/user';
import { setCompositeRoles } from '@app/controllers/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const authorized = await isAllowedToManageRoles(session as Session, req.body.integrationId);
      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to update composite roles' });
      const result = await setCompositeRoles(session?.user?.id!, req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
