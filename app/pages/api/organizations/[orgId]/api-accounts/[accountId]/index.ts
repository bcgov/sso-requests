import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { deleteOrganizationApiAccount, updateOrganizationApiAccountGrants } from '@app/controllers/organization';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);
    const orgId = Number(req.query.orgId);
    const accountId = Number(req.query.accountId);

    if (req.method === 'PUT') {
      const result = await updateOrganizationApiAccountGrants(
        session as Session,
        orgId,
        accountId,
        req.body.grants || [],
      );
      return res.status(200).json(result);
    } else if (req.method === 'DELETE') {
      return res.status(200).json(await deleteOrganizationApiAccount(session as Session, orgId, accountId));
    } else {
      res.setHeader('Allow', ['PUT', 'DELETE']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
