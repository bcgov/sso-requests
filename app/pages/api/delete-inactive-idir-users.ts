import type { NextApiRequest, NextApiResponse } from 'next';
import { deleteStaleUsers } from '@app/controllers/user';
import getConfig from 'next/config';
import { handleError } from '@app/utils/helpers';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { api_auth_secret } = serverRuntimeConfig;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { Authorization, authorization } = req.headers || {};
    const authHeader = Authorization || authorization;
    if (!authHeader || authHeader !== api_auth_secret) {
      res.status(401).json({ success: false, message: 'not authorized' });
      return false;
    }
    const result = await deleteStaleUsers(req.body);
    if (result) res.status(200).json({ success: true });
    else res.status(404).json({ success: false, message: 'user not found' });
  } catch (err) {
    handleError(res, err);
  }
}
