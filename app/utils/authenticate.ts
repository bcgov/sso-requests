import { AxiosResponse } from 'axios';
import { JsonWebKey } from 'crypto';
import createHttpError from 'http-errors';
import getConfig from 'next/config';

const { serverRuntimeConfig = {} } = getConfig() || {};
const { sso_configuration_endpoint, sso_client_id } = serverRuntimeConfig;

import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jws from 'jws';
import jwkToPem from 'jwk-to-pem';
import { NextApiRequest, NextApiResponse } from 'next';
import { Session, User } from '@app/shared/interfaces';
import { findOrCreateUser } from '@app/controllers/user';
import { isAdmin } from './helpers';

const ssoConfigurationEndpoint = sso_configuration_endpoint;
const audience = sso_client_id;

let _ssoConfig: { jwks: any; issuer: string } = { jwks: null, issuer: '' };

const getConfiguration = async () => {
  const { issuer, jwks_uri } = await axios.get(ssoConfigurationEndpoint as string).then(
    (res: AxiosResponse) => res.data,
    () => null,
  );

  const jwks = await axios.get(jwks_uri).then(
    (res: AxiosResponse) => res.data,
    () => null,
  );

  _ssoConfig = { jwks, issuer };
  return _ssoConfig;
};

const validateJWTSignature = async (token: any) => {
  try {
    // 1. Decode the ID token.
    const { header } = jws.decode(token) as jws.Signature;

    // 2. Compare the local key ID (kid) to the public kid.
    const { jwks, issuer } = await getConfiguration();

    const key = jwks.keys.find((jwkKey: JsonWebKey) => jwkKey.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      return null;
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    const {
      identity_provider,
      idir_user_guid: idir_userid,
      email,
      client_roles,
      family_name,
      given_name,
    } = jwt.verify(token, pem, {
      audience,
      issuer,
      maxAge: '8h',
      ignoreExpiration: true,
    }) as JwtPayload;

    if (!['idir', 'azureidir'].includes(identity_provider) || !idir_userid) {
      throw new createHttpError.Unauthorized('IDP is not IDIR');
    }

    return { idir_userid, email, client_roles: client_roles || [], family_name, given_name, bearerToken: '' };
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const authenticate = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<{ session: Session; user: User } | null> => {
  try {
    const authHeader = req.headers?.authorization;
    if (!authHeader) {
      res.status(401).json({ success: false, message: 'not authorized' });
      return null;
    }
    const bearerToken = (authHeader as string).split('Bearer ')[1] as string;
    const session = (await validateJWTSignature(bearerToken)) as any;
    session.bearerToken = bearerToken;
    const user: User = await findOrCreateUser(session);
    user.isAdmin = isAdmin(session);
    session.user = user;
    return { session, user };
  } catch (error) {
    console.error(error);
    res.status(401).json({ success: false, message: 'not authorized' });
    return null;
  }
};
