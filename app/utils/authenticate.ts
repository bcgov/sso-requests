import axios, { AxiosResponse } from 'axios';
import createHttpError from 'http-errors';

import jwt, { JwtPayload } from 'jsonwebtoken';
import jws from 'jws';
import jwkToPem from 'jwk-to-pem';
import { Session } from '@app/shared/interfaces';
import { IncomingHttpHeaders } from 'http';
import { addLogContext, logger } from '@app/utils/logger';

const log = logger.child({ module: 'authenticate' });

const ssoConfigurationEndpoint = process.env.NEXT_PUBLIC_SSO_CONFIGURATION_ENDPOINT || '';
const audience = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || '';

let _ssoConfig: { jwks: any; issuer: string } = { jwks: null, issuer: '' };

export const getConfiguration = async () => {
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

const validateJWTSignature = async (token: string): Promise<Session | boolean> => {
  try {
    // 1. Decode the ID token.
    const { header } = jws.decode(token) as jws.Signature;

    // 2. Compare the local key ID (kid) to the public kid.
    const { jwks, issuer } = await getConfiguration();

    const key = jwks.keys.find((jwkKey: any) => jwkKey.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      return false;
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
    }) as JwtPayload;

    if (!['idir', 'azureidir'].includes(identity_provider) || !idir_userid) {
      throw new createHttpError.Unauthorized('IDP is not IDIR');
    }

    return { idir_userid, email, client_roles: client_roles || [], family_name, given_name, bearerToken: '' };
  } catch (err) {
    // Expired and malformed tokens land here on every stale browser tab, so this is not an error.
    log.warn({ err }, 'rejected bearer token');
    return false;
  }
};

export const authenticate = async (headers: IncomingHttpHeaders): Promise<Session | Boolean> => {
  try {
    const authHeader = headers?.authorization;
    if (!authHeader) {
      return false;
    }
    const bearerToken = (authHeader as string).split('Bearer ')[1] as string;
    const session = await validateJWTSignature(bearerToken);
    if (session && typeof session === 'object') addLogContext({ userId: session.idir_userid });
    return session as any;
  } catch (err) {
    log.error({ err }, 'failed to authenticate request');
    return false;
  }
};
