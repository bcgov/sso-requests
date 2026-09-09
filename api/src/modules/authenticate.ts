import * as fs from 'fs';
import createHttpError from 'http-errors';
import * as path from 'path';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import jws from 'jws';
import jwkToPem from 'jwk-to-pem';
import logger from '@/logger';

export interface Claims {
  teamId: number | null;
  apiClientId: string;
}

export interface Auth {
  success: boolean;
  data: Claims | null;
  err: string | null;
}

const authServerUrl = process.env.KEYCLOAK_PROD_URL;

const failedAuth: Auth = { success: false, data: null, err: 'not authorized' };

let _ssoConfig: { jwks: any; issuer: string } = null;

const ssoConfigurationPath = path.resolve(__dirname, 'api-sso-configuration.json');
if (fs.existsSync(ssoConfigurationPath)) {
  _ssoConfig = require(ssoConfigurationPath);
}

const getConfiguration = async () => {
  if (_ssoConfig) return _ssoConfig;

  const { issuer, jwks_uri } = await axios
    .get(`${authServerUrl}/auth/realms/standard/.well-known/openid-configuration`)
    .then(
      (res) => res.data,
      () => null,
    );
  const jwks = await axios.get(jwks_uri).then(
    (res) => res.data,
    () => null,
  );

  _ssoConfig = { jwks, issuer };
  return _ssoConfig;
};

const validateJWTSignature = async (token) => {
  try {
    // 1. Decode the ID token.
    const { header } = jws.decode(token);

    // 2. Compare the local key ID (kid) to the public kid.
    const { jwks, issuer } = await getConfiguration();

    const key = jwks.keys.find((jwkKey) => jwkKey.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      throw new createHttpError.Unauthorized('could not validate token - kid not found in the list of public keys');
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    const decoded = jwt.verify(token, pem, { issuer });
    // Empty and the literal string "null" both mean "no team" (organization
    // accounts have none); either can appear depending on how the claim was set.
    const rawTeam = typeof decoded === 'object' && 'team' in decoded ? decoded.team : null;
    const team = !rawTeam || rawTeam === 'null' ? null : rawTeam;
    // azp identifies the API account's Keycloak client and is what authorization
    // is resolved from; the team claim is retained for backwards compatibility
    // but is not used to make access decisions.
    const azp = typeof decoded === 'object' && 'azp' in decoded ? decoded.azp : null;
    if (typeof azp !== 'string' || azp.trim().length === 0) {
      throw new createHttpError.Unauthorized('could not validate token - invalid azp claim');
    }

    return { success: true, data: { teamId: team, apiClientId: azp }, err: null };
  } catch (err) {
    logger.error(err);

    if (err.name === 'TokenExpiredError') failedAuth.err = 'token expired';
    else if (err.name === 'JsonWebTokenError') failedAuth.err = 'invalid token';
    else if (err.name === 'Error') failedAuth.err = err.message;
    return failedAuth;
  }
};

export const authenticate = async (headers: any) => {
  const { Authorization, authorization } = headers || {};
  const authHeader = Authorization || authorization;
  if (!authHeader) {
    failedAuth.err = 'No authorization header was found';
    return failedAuth;
  }
  const bearerToken = authHeader.split('Bearer ')[1];
  if (!bearerToken) {
    failedAuth.err = 'No authorization token was found';
    return failedAuth;
  }
  const apiAuth: Auth = await validateJWTSignature(bearerToken);
  return apiAuth;
};
