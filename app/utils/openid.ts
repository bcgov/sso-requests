import axios, { AxiosRequestConfig } from 'axios';
import qs from 'qs';

import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const {
  sso_client_id,
  sso_authorization_scope,
  sso_authorization_response_type,
  sso_redirect_uri,
  sso_token_grant_type,
} = publicRuntimeConfig;

import { meta } from './provider';

import { getRandomString, encryptStringWithSHA256, hashToBase64url } from './helpers';

export const getAuthorizationUrl = async () => {
  // Create random "state"
  const state = getRandomString();
  sessionStorage.setItem('pkce_state', state);

  // Create PKCE code verifier
  const code_verifier = getRandomString();
  sessionStorage.setItem('code_verifier', code_verifier);

  // Create code challenge
  const arrayHash: any = await encryptStringWithSHA256(code_verifier);
  const code_challenge = hashToBase64url(arrayHash);
  sessionStorage.setItem('code_challenge', code_challenge);

  const params = {
    client_id: sso_client_id,
    response_type: sso_authorization_response_type,
    redirect_uri: sso_redirect_uri,
    scope: sso_authorization_scope,
    // PKCE workflow
    state,
    code_challenge_method: 'S256',
    code_challenge,
  };

  return `${meta.authorization_endpoint}?${qs.stringify(params, { encode: false })}`;
};

export const getAccessToken = async ({ code, state }: { code: string; state: string }) => {
  // PKCE workflow
  if (sessionStorage.getItem('pkce_state') !== state) {
    console.error('invalid state');
    return null;
  }

  const code_verifier = sessionStorage.getItem('code_verifier');

  const params = {
    grant_type: sso_token_grant_type,
    client_id: sso_client_id,
    redirect_uri: sso_redirect_uri,
    code,
    // PKCE workflow
    code_verifier,
  };

  const url = `${meta.token_endpoint}`;

  const config: AxiosRequestConfig = {
    url,
    method: 'post',
    data: qs.stringify(params),
  };

  return axios(config).then((res) => res.data, console.error);
};
