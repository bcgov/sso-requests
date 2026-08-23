import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticate, getConfiguration } from '@app/utils/authenticate';
import { Session } from '@app/shared/interfaces';
import { handleError } from '@app/utils/helpers';
import { processUserSession } from '@app/controllers/user';
import { getSdxServicesForClient, processSdxWorkflowUpdates } from '@app/controllers/sdx-services';
import jws from 'jws';
import jwkToPem from 'jwk-to-pem';
import jwt, { JwtPayload } from 'jsonwebtoken';

const audience = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const userSession = await authenticate(req.headers);
      if (!userSession) return res.status(401).json({ success: false, message: 'not authorized' });
      const { session } = await processUserSession(userSession as Session);
      const { id, status, environment } = req.query || {};
      if (!id) return res.status(400).json({ success: false, message: 'Integration ID is required' });
      const result = await getSdxServicesForClient(session as Session, Number(id), (status as string) || 'approved');
      return res.status(200).json(result);
    } else if (req.method === 'PUT') {
      try {
        const { authorization } = req.headers;
        if (!authorization) throw new Error('Authorization header is required');

        const token = authorization.split(' ')[1];
        if (!token) throw new Error('Bearer token is required');

        const { header } = jws.decode(token) as jws.Signature;

        const { jwks, issuer } = await getConfiguration();

        const key = jwks.keys.find((jwkKey: any) => jwkKey.kid === header.kid);
        const isValidKid = !!key;

        if (!isValidKid) {
          throw new Error('Invalid key ID');
        }

        const pem = jwkToPem(key);

        jwt.verify(token, pem, {
          audience,
          issuer,
        }) as JwtPayload;
      } catch (err) {
        console.error('Error validating token:', err);
        return res.status(401).json({ success: false, message: 'not authorized' });
      }

      const { id } = req.query || {};
      if (!id) return res.status(400).json({ success: false, message: 'Integration ID is required' });

      await processSdxWorkflowUpdates(Number(id), req.body);
      return res.status(200).json({ success: true });
    } else {
      res.setHeader('Allow', ['GET', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    handleError(res, error);
  }
}
