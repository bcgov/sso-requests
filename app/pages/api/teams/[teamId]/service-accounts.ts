import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError, processUserSession } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { getServiceAccounts, requestServiceAccount } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const { teamId } = req.query;
      const result = await getServiceAccounts(session?.user?.id!, Number(teamId));
      return res.status(200).json(result);
    } else if (req.method === 'POST') {
      const { teamId } = req.query;
      const result = await requestServiceAccount(
        session as Session,
        session?.user?.id!,
        Number(teamId),
        session?.user?.displayName!,
      );
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
