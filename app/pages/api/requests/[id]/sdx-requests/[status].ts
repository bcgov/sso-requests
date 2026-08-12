import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { createSdxRequest, getSdxServicesForClient } from '@app/controllers/sdx-services';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const userSession = await authenticate(req.headers);
    if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
    const { session } = await processUserSession(userSession as Session);

    if (req.method === 'GET') {
      const { id, status } = req.query || {};
      if (!id) return res.status(404).json({ success: false, message: 'Integration ID is required' });
      const result = await getSdxServicesForClient(session as Session, Number(id), (status as string) || 'approved');
      return res.status(200).json(result);
    } else if (req.method === 'POST') {
      const { id } = req.query || {};
      if (!id) return res.status(404).json({ success: false, message: 'Integration ID is required' });
      const result = await createSdxRequest(session as Session, Number(id), req.body);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
