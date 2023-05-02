const authServerUrl = process.env.KEYCLOAK_V2_PROD_URL;
import * as fs from 'fs';
import * as path from 'path';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

export interface Claims {
  teamId: number | null;
}

export interface Auth {
  success: boolean;
  data: Claims | null;
  err: string | null;
}

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
      throw new Error('[invalid token] kid not found in the list of public keys');
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    const { team } = jwt.verify(token, pem, { issuer });
    if (!team) {
      throw new Error('[invalid token] expected claims not found');
    }

    return { success: true, data: { teamId: team }, err: null };
  } catch (err) {
    console.log(err);

    if (err.name === 'TokenExpiredError') failedAuth.err = 'token expired';
    else if (err.name === 'JsonWebTokenError') failedAuth.err = 'invalid token';
    else if (err.name === 'Error') failedAuth.err = err.message;
    return failedAuth;
  }
};

export const authenticate = async (headers) => {
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
