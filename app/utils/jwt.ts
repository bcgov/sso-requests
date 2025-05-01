import rs from 'jsrsasign';
import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const { sso_client_id } = publicRuntimeConfig;

import { meta } from './provider';
import { parseJWTPayload, parseJWTHeader } from './helpers';

const h8 = 8 * 60 * 60;

export const verifyToken = async (token: string) => {
  if (!token) return [, 'e02'];

  const keys = meta.keys;
  const tokenHeader = parseJWTHeader(token);

  // search for the kid key id in the JWK Keys
  const key = keys?.find((currentKey: { kid: string }) => currentKey.kid === tokenHeader.kid);
  if (key === undefined) {
    console.error('public key not found in JWK jwks.json');
    return [, 'e02'];
  }

  // verify token has not expired
  const tokenPayload = parseJWTPayload(token);
  if (Date.now() >= tokenPayload.exp * 1000) {
    console.log('token has expired');
    return [, 'e02'];
  }

  // TODO: see if validation results from API also invalid when having token issue again.
  // const isValidForAPI = await verifyTokenWithAPI(token);
  // console.log('isValidForAPI', isValidForAPI);

  // verify JWT Signature
  const keyObj: any = rs.KEYUTIL.getKey(key);
  const isValid = rs.KJUR.jws.JWS.verifyJWT(token, keyObj, { alg: ['RS256'], gracePeriod: h8 });
  if (!isValid) {
    console.error('signature verification failed');
    return [, 'e02'];
  }

  // verify app_client_id
  const n = tokenPayload.aud.localeCompare(sso_client_id);
  if (n !== 0) {
    console.error('token was not issued for this audience');
    return [, 'e02'];
  }

  if (!['idir', 'azureidir'].includes(tokenPayload.identity_provider)) {
    console.error(`invalid identity provider ${tokenPayload.identity_provider}`);
    return [, 'e03'];
  }

  if (!tokenPayload.idir_user_guid || !tokenPayload.email) {
    console.error('invalid user account');
    return [, 'e03'];
  }

  return [tokenPayload];
};
