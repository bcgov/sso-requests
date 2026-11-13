/**
 * Environment configuration for both tiers. Everything has a default that matches docker-compose.e2e.yml, so the
 * CI tier runs with zero configuration; the live tier reads credentials from E2E_LIVE_USERS (see README.md).
 */

export type Role = 'user' | 'additionalUser' | 'admin';
export type KcEnv = 'dev' | 'test' | 'prod';

const env = (name: string, fallback: string) => process.env[name] || fallback;

export const ci = {
  appUrl: env('E2E_BASE_URL', 'http://localhost:3000'),
  /** Issuer host for the app's own login. Must match NEXT_PUBLIC_SSO_URL in docker-compose.e2e.yml. */
  ssoUrl: env('E2E_SSO_URL', 'http://dev-keycloak.localtest.me:9080/auth'),
  ssoClientId: env('E2E_SSO_CLIENT_ID', 'css-app-e2e'),
  /** Seeded by local/terraform/e2e.tf. */
  users: {
    user: { username: 'e2e-user', password: 'password', email: 'e2e.user@gov.bc.ca' },
    /** A second regular user, for tests that need two people (e.g. sharing through a team). */
    additionalUser: { username: 'e2e-additional-user', password: 'password', email: 'e2e.additional-user@gov.bc.ca' },
    admin: { username: 'e2e-admin', password: 'password', email: 'e2e.admin@gov.bc.ca' },
  } satisfies Record<Role, { username: string; password: string; email: string }>,
  /** Admin access to the three local keycloaks the app provisions integrations into. */
  keycloaks: {
    dev: env('E2E_KC_DEV_URL', 'http://localhost:9080'),
    test: env('E2E_KC_TEST_URL', 'http://localhost:9081'),
    prod: env('E2E_KC_PROD_URL', 'http://localhost:9082'),
  } satisfies Record<KcEnv, string>,
  keycloakAdmin: { username: env('E2E_KC_ADMIN_USER', 'admin'), password: env('E2E_KC_ADMIN_PASSWORD', 'admin') },
};

export const authFile = (role: Role) => `.auth/${role}.json`;
