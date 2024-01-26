import axios, { AxiosRequestConfig } from 'axios';
import qs from 'qs';
import { AuthUrlParams } from 'interfaces/utils';

import getConfig from 'next/config';

const { publicRuntimeConfig = {} } = getConfig() || {};
const {
  sso_client_id,
  sso_authorization_scope,
  sso_authorization_response_mode,
  sso_authorization_response_type,
  sso_redirect_uri,
  sso_token_grant_type,
} = publicRuntimeConfig;

import { meta } from './provider';

import { getRandomString, encryptStringWithSHA256, hashToBase64url } from './helpers';

export const getAuthorizationUrl = async (otherParams: AuthUrlParams) => {
  // Create random "state"
  const state = getRandomString();
  const nonce = getRandomString();
  sessionStorage.setItem('oauth_state', state);
  sessionStorage.setItem('oidc_nonce', nonce);

  // Create PKCE code verifier
  const code_verifier = getRandomString();
  sessionStorage.setItem('code_verifier', code_verifier);

  // Create code challenge
  const arrayHash: any = await encryptStringWithSHA256(code_verifier);
  const code_challenge = hashToBase64url(arrayHash);
  sessionStorage.setItem('code_challenge', code_challenge);

  const params = {
    client_id: sso_client_id,
    response_mode: sso_authorization_response_mode,
    response_type: sso_authorization_response_type,
    redirect_uri: sso_redirect_uri,
    scope: sso_authorization_scope,
    // PKCE workflow
    state,
    nonce,
    code_challenge_method: 'S256',
    code_challenge,
    ...otherParams,
  };

  return `${meta.authorization_endpoint}?${qs.stringify(params, { encode: false })}`;
};

export const getAccessToken = async ({ code, state }: { code: string; state: string }) => {
  // PKCE workflow
  const expectedState = sessionStorage.getItem('oauth_state');
  if (expectedState !== state) {
    console.error('invalid pkce state');
    console.error('expected state: ' + expectedState);
    console.error('received state: ' + state);
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

  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('code_verifier');
  sessionStorage.removeItem('code_challenge');

  return axios(config).then((res) => res.data, console.error);
};

export const getEndSessionUrl = () => {
  const params = {
    redirect_uri: sso_redirect_uri,
  };

  return `${meta.end_session_endpoint}?${qs.stringify(params, { encode: false })}`;
};

// see https://access.redhat.com/solutions/3793991
export const refreshSession = async ({ refreshToken }: { refreshToken: string }) => {
  const params = {
    grant_type: 'refresh_token',
    client_id: sso_client_id,
    refresh_token: refreshToken,
  };

  const url = `${meta.token_endpoint}`;

  const config: AxiosRequestConfig = {
    url,
    method: 'post',
    data: qs.stringify(params),
  };

  return axios(config).then((res) => res.data, console.error);
};

export const parseCallbackParams = () => {
  let params = '';
  if (sso_authorization_response_mode === 'fragment') {
    params = '?' + window.location.hash.substring(1);
  } else {
    params = window.location.search;
  }

  const urlParams = new URLSearchParams(params);
  const getParam = (p: string) => urlParams.get(p) || '';

  return {
    code: getParam('code'),
    state: getParam('state'),
    session_state: getParam('session_state'),
  };
};
