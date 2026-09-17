import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { deleteOrganization, getOrganization, updateOrganization } from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);
    const orgId = Number(req.query.orgId);

    if (req.method === 'GET') {
      return res.status(200).json(await getOrganization(session as Session, orgId));
    } else if (req.method === 'PUT') {
      return res.status(200).json(await updateOrganization(session as Session, orgId, req.body));
    } else if (req.method === 'DELETE') {
      return res.status(200).json(await deleteOrganization(session as Session, orgId));
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
