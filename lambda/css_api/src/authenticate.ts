const authServerUrl =
  process.env.APP_ENV === 'development' ? `${process.env.KEYCLOAK_V2_PROD_URL}` : 'https://oidc.gov.bc.ca';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

const getConfiguration = async () => {
  const { issuer, jwks_uri } = await axios
    .get(`${authServerUrl}/auth/realms/standard/.well-known/openid-configuration`)
    .then(
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
    const { team } = jwt.verify(token, pem, { issuer });
    if (!team) {
      throw new Error('Invalid token');
    }

    return team;
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
  const currentTeam = await validateJWTSignature(bearerToken);
  if (!currentTeam) return currentTeam;
  return currentTeam;
};
