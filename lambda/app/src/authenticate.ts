const ssoConfigurationEndpoint = process.env.SSO_CONFIGURATION_ENDPOINT;
const audience = process.env.SSO_CLIENT_ID;
import * as fs from 'fs';
import * as path from 'path';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

let _ssoConfig: { jwks: any; issuer: string } = null;

const ssoConfigurationPath = path.resolve(__dirname, 'sso-configuration.json');
if (fs.existsSync(ssoConfigurationPath)) {
  _ssoConfig = require(ssoConfigurationPath);
}

const getConfiguration = async () => {
  if (_ssoConfig) return _ssoConfig;

  const { issuer, jwks_uri } = await axios.get(ssoConfigurationEndpoint).then(
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
    });
    if (!['idir', 'azureidir'].includes(identity_provider) || !idir_userid) {
      throw new Error('IDP is not IDIR');
    }

    return { idir_userid, email, client_roles: client_roles || [], family_name, given_name, bearerToken: null };
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const authenticate = async (headers) => {
  const { Authorization, authorization } = headers || {};
  const authHeader = Authorization || authorization;
  if (!authHeader) return false;

  const bearerToken = authHeader.split('Bearer ')[1];
  const currentUser = await validateJWTSignature(bearerToken);
  if (!currentUser) return currentUser;

  currentUser.bearerToken = bearerToken;
  return currentUser;
};
