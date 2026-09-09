import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import {
  getOrganizationApiAccountCredentials,
  updateOrganizationApiAccountSecret,
} from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);
    const orgId = Number(req.query.orgId);
    const accountId = Number(req.query.accountId);

    if (req.method === 'GET') {
      return res.status(200).json(await getOrganizationApiAccountCredentials(session as Session, orgId, accountId));
    } else if (req.method === 'PUT') {
      return res.status(200).json(await updateOrganizationApiAccountSecret(session as Session, orgId, accountId));
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
