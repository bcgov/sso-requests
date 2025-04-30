import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { bulkCreateClientRoles } from '@app/controllers/roles';
import { isAllowedToManageRoles } from '@app/controllers/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const isAuth = await authenticate(req, res);
      if (!isAuth) return;
      const { session } = isAuth as { session: Session };
      const authorized = await isAllowedToManageRoles(session as Session, req.body.integrationId);

      if (!authorized)
        return res.status(401).json({ success: false, message: 'You are not authorized to create role' });

      const result = await bulkCreateClientRoles(session?.user?.id as number, req.body);
      res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
