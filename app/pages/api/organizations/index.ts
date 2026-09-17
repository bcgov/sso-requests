import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { createOrganization, listOrganizations } from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      return res.status(200).json(await listOrganizations(session as Session));
    } else if (req.method === 'POST') {
      return res.status(200).json(await createOrganization(session as Session, req.body));
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
