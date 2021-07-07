const configurationEndpoint = process.env.CONFIGURATION_ENDPOINT;
const audience = process.env.AUD;
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

const getConfiguration = async () => {
  const { issuer, jwks_uri } = await axios.get(configurationEndpoint).then(
    (res) => res.data,
    () => null
  );
  const jwk = await axios.get(jwks_uri).then(
    (res) => res.data,
    () => null
  );
  return { jwk, issuer };
};

const validateJWTSignature = async (token) => {
  try {
    // 1. Decode the ID token.
    const { header } = jws.decode(token);

    // 2. Compare the local key ID (kid) to the public kid.
    const { jwk, issuer } = await getConfiguration();

    const key = jwk.keys.find((key) => key.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      return null;
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    jwt.verify(token, pem, { audience, issuer, maxAge: '2h', ignoreExpiration: true });
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};

export const authenticate = async (headers) => {
  const { Authorization } = headers || {};
  if (!Authorization) return false;

  const bearerToken = Authorization.split('Bearer ')[1];
  const isValid = await validateJWTSignature(bearerToken);

  return isValid;
};
