import { APIGatewayProxyEvent, Context, Callback } from 'aws-lambda';
const axios = require('axios');
const jwt = require('jsonwebtoken');
const jws = require('jws');
const jwkToPem = require('jwk-to-pem');

const JWK_URL = 'https://dev.oidc.gov.bc.ca/auth/realms/onestopauth/protocol/openid-connect/certs';
const ISSUER = 'https://dev.oidc.gov.bc.ca/auth/realms/onestopauth';
const AUD = 'tmp-sso-requests';

export const handler = async (event: APIGatewayProxyEvent, context?: Context, callback?: Callback) => {
  const jwk = await getJWK();
  const { headers } = event;

  const authenticated = await authenticate(headers);

  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
    body: `${authenticated ? 'Valid credentials' : 'Not valid'}`,
  };
  callback(null, response);
};

const getJWK = async () => {
  const jwk = await axios.get(JWK_URL).then(
    res => res.data,
    () => null
  );

  return jwk;
};

const authenticate = async headers => {
  const { authorization } = headers || {};
  if (!authorization) return false;

  const bearerToken = authorization.split('Bearer ')[1];
  const isValid = await validateJWTSignature(bearerToken);

  return isValid;
};

export const validateJWTSignature = async token => {
  try {
    // 1. Decode the ID token.
    const { header, payload, signature } = jws.decode(token);

    // 2. Compare the local key ID (kid) to the public kid.
    const jwk = await getJWK();

    const key = jwk.keys.find(key => key.kid === header.kid);
    const isValidKid = !!key;

    if (!isValidKid) {
      return null;
    }

    // 3. Verify the signature using the public key
    const pem = jwkToPem(key);

    // jwt.verify throws error if invalid
    // If setting ignoreExpiration to true, you can control the maxAge on the backend
    jwt.verify(token, pem, { audience: AUD, issuer: ISSUER, maxAge: '2h', ignoreExpiration: true });
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
};
