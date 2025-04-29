import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const isAuth = await authenticate(req, res);
  if (!isAuth) return;
  const { session } = isAuth as { session: Session };
  res.status(200).json(session);
}
