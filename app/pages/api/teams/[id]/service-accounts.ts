import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { getServiceAccounts, requestServiceAccount } from '@app/controllers/team';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      const { id: teamId } = req.query;
      const result = await getServiceAccounts(session?.user?.id!, Number(teamId));
      res.status(200).json(result);
    } else if (req.method === 'POST') {
      const { id: teamId } = req.query;
      const result = await requestServiceAccount(
        session as Session,
        session?.user?.id!,
        Number(teamId),
        session?.user?.displayName!,
      );
      res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
