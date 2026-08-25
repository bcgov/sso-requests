import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { previewRoleMfaReplication, replicateRoleMfa } from '@app/controllers/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'POST') {
      const { environment, integrationId, roleName, dryRun } = req.body;
      const result = dryRun
        ? await previewRoleMfaReplication(session?.user?.id!, { environment, integrationId, roleName })
        : await replicateRoleMfa(session?.user?.id!, { environment, integrationId, roleName });
      return res.status(200).json({ data: result });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
