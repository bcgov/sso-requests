import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { removeOrganizationMember, updateOrganizationMemberRole } from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);
    const orgId = Number(req.query.orgId);
    const userId = Number(req.query.userId);

    if (req.method === 'PUT') {
      return res.status(200).json(await updateOrganizationMemberRole(session as Session, orgId, userId, req.body.role));
    } else if (req.method === 'DELETE') {
      return res.status(200).json(await removeOrganizationMember(session as Session, orgId, userId));
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
