import type { NextApiRequest, NextApiResponse } from 'next';
import { handleError } from '@app/utils/helpers';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { assertSessionRole } from '@app/helpers/permissions';
import { getDatabaseTable } from '@app/controllers/reports';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const isAuth = await authenticate(req, res);
    if (!isAuth) return;
    const { session } = isAuth as { session: Session };
    if (req.method === 'GET') {
      assertSessionRole(session, 'sso-admin');
      const result = await getDatabaseTable(req?.query?.type as string, req?.query?.orderBy as string);
      res.status(200).json(result);
    }
  } catch (error) {
    handleError(res, error);
  }
}
