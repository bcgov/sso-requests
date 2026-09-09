import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { searchIdirUsers } from '@app/utils/ms-graph-idir';
import { Session } from '@app/shared/interfaces';
import { processUserSession, assertCanLookupIntegrationUsers } from '@app/controllers/user';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });

    if (req.method === 'POST') {
      try {
        const { session } = await processUserSession(userSession as Session);
        await assertCanLookupIntegrationUsers(session, req.body);
        const { integrationId, environment, ...query } = req.body;
        const result = await searchIdirUsers(query);
        return res.status(200).json(result);
      } catch (err) {
        handleError(res, err);
        return;
      }
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
