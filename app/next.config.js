const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  reactStrictMode: true,
  serverRuntimeConfig: {},
  publicRuntimeConfig: {
    api_url: process.env.API_URL || '',
    sso_url: process.env.SSO_URL || 'http://localhost:8080',
    sso_client_id: process.env.SSO_CLIENT_ID || '',
    sso_redirect_uri: process.env.SSO_REDIRECT_URI || 'http://localhost:3000',
    sso_authorization_response_type: process.env.SSO_AUTHORIZATION_RESPONSE_TYPE || 'code',
    sso_authorization_scope: process.env.SSO_AUTHORIZATION_SCOPE || 'openid',
    sso_token_grant_type: process.env.SSO_TOKEN_GRANT_TYPE || 'authorization_code',
  },
  env: {},
  assetPrefix: isProd ? 'https://bcgov.github.io/sso-requests/' : '',
};
