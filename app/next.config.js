const APP_URL = process.env.APP_URL || '';
const BASE_PATH = process.env.APP_BASE_PATH || '';

module.exports = {
  reactStrictMode: true,
  serverRuntimeConfig: {},
  publicRuntimeConfig: {
    app_env: process.env.APP_ENV || 'develop',
    base_path: BASE_PATH,
    app_url: APP_URL,
    api_url: process.env.API_URL || '',
    sso_url: process.env.SSO_URL || 'http://localhost:8080',
    sso_client_id: process.env.SSO_CLIENT_ID || '',
    sso_redirect_uri: process.env.SSO_REDIRECT_URI || APP_URL || 'http://localhost:3000',
    sso_authorization_response_type: process.env.SSO_AUTHORIZATION_RESPONSE_TYPE || 'code',
    sso_authorization_scope: process.env.SSO_AUTHORIZATION_SCOPE || 'openid',
    sso_token_grant_type: process.env.SSO_TOKEN_GRANT_TYPE || 'authorization_code',
    kc_idp_hint: process.env.KC_IDP_HINT || '',
  },
  env: {},
  assetPrefix: APP_URL,
  // basePath has to start with a /
  // basePath has to be either an empty string or a path prefix
  basePath: BASE_PATH,
  async rewrites() {
    return [
      {
        source: '/lambda/app/:path*',
        destination: 'http://localhost:8080/lambda/app/:path*', // Proxy to Backend
      },
    ];
  },
};
