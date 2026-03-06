// pages/api/config.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === 'GET') {
      const config = {
        app_url: process.env.APP_URL || 'http://localhost:3000',
        app_env: process.env.APP_ENV || 'development',
        base_path: process.env.BASE_PATH,
        api_url: process.env.API_URL || 'http://localhost:3000/api',
        sso_url: process.env.SSO_URL || 'http://localhost:8080',
        sso_redirect_uri: process.env.SSO_REDIRECT_URI || process.env.APP_URL || 'http://localhost:3000',
        sso_authorization_response_mode: process.env.SSO_AUTHORIZATION_RESPONSE_MODE || 'fragment', // 'query' | 'fragment'
        sso_authorization_response_type: process.env.SSO_AUTHORIZATION_RESPONSE_TYPE || 'code',
        sso_authorization_scope: process.env.SSO_AUTHORIZATION_SCOPE || 'openid',
        sso_token_grant_type: process.env.SSO_TOKEN_GRANT_TYPE || 'authorization_code',
        maintenance_mode: process.env.MAINTENANCE_MODE_ACTIVE || false,
        kc_idp_hint: process.env.KC_IDP_HINT || '',
        sso_client_id: process.env.SSO_CLIENT_ID || 'testclient',
        include_digital_credential: process.env.INCLUDE_DIGITAL_CREDENTIAL || false,
        include_otp: process.env.INCLUDE_OTP || false,
        include_bc_services_card: process.env.INCLUDE_BC_SERVICES_CARD || false,
        include_social: process.env.INCLUDE_SOCIAL || false,
        allow_bc_services_card_prod: process.env.ALLOW_BC_SERVICES_CARD_PROD || false,
      };

      res.status(200).json(config);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
}
