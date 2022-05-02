const configurationEndpoint = process.env.CONFIGURATION_ENDPOINT;
const audience = process.env.SSO_CLIENT_ID;
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

const getConfiguration = async () => {
  const { issuer, jwks_uri } = await axios.get(configurationEndpoint).then(
    (res) => res.data,
    () => null,
  );
  const jwk = await axios.get(jwks_uri).then(
    (res) => res.data,
    () => null,
  );
  return { jwk, issuer };
};

const validateJWTSignature = async (token) => {
  try {
    // 1. Decode the ID token.
    const { header } = jws.decode(token);

    // 2. Compare the local key ID (kid) to the public kid.
    const { jwk, issuer } = await getConfiguration();

    const key = jwk.keys.find((jwkKey) => jwkKey.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      return null;
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    const { identity_provider, idir_userid, email, client_roles, family_name, given_name } = jwt.verify(token, pem, {
      audience,
      issuer,
      maxAge: '8h',
      ignoreExpiration: true,
    });
    if (identity_provider !== 'idir' || !idir_userid) {
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
