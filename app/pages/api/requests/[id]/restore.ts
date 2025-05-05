import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError, processUserSession } from '@app/utils/helpers';
import { restoreRequest } from '@app/controllers/requests';
import createHttpError from 'http-errors';
import { assertSessionRole } from '@app/helpers/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'POST') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);

      assertSessionRole(session, 'sso-admin');
      const { id } = req.query || {};
      let { email } = req.body || {};
      if (typeof email === 'string') {
        email = email.toLowerCase();
      }
      if (!id) {
        throw new createHttpError.NotFound('integration ID not found');
      }
      const result = await restoreRequest(session as Session, Number(id), email);
      return res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
