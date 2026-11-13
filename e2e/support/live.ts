import { Browser } from '@playwright/test';
import { AppApi } from './api';

/**
 * Live tier configuration. Credentials come from E2E_LIVE_USERS, a JSON array in the same shape as the existing
 * CYPRESS_USERS secret so it can be reused as-is:
 *   [{ "type": "azureidir", "username": "PFDRSSOT", "email": "...", "password": "...", "otpsecret": "..." }, ...]
 * `type` is the IdP the account logs in with (azureidir, bceidbasic, bceidbusiness, githubbcgov, ...).
 */
export const live = {
  appUrl: process.env.E2E_LIVE_BASE_URL ?? 'https://sso-requests-sandbox.apps.gold.devops.gov.bc.ca',
  /** Keycloak the sandbox app provisions into (dev environment). */
  ssoUrl: process.env.E2E_LIVE_SSO_URL ?? 'https://dev.sandbox.loginproxy.gov.bc.ca/auth',
  playgroundUrl: process.env.E2E_LIVE_PLAYGROUND_URL ?? 'https://bcgov.github.io/keycloak-example-apps/',
  /** Accounts used for the CSS app itself: a regular user and an sso-admin, both Azure IDIR. */
  cssUser: process.env.E2E_LIVE_CSS_USER ?? 'PFDRSSOT',
  cssAdmin: process.env.E2E_LIVE_CSS_ADMIN ?? 'PFSSOT2',
};

export interface LiveUser {
  type: string;
  username: string;
  password: string;
  email?: string;
  otpsecret?: string;
}

let users: LiveUser[] | undefined;

/** Finds a live account by IdP type, and username when there are several of that type. */
export function liveUser(type: string, username?: string): LiveUser {
  users ??= JSON.parse(process.env.E2E_LIVE_USERS || '[]');
  const user = users!.find((u) => u.type === type && (!username || u.username === username));
  if (!user) throw new Error(`E2E_LIVE_USERS has no ${type} account${username ? ` named ${username}` : ''}`);
  return user;
}

export const liveAuthFile = (who: 'user' | 'admin') => `.auth/live-${who}.json`;

/**
 * The live app only accepts tokens from a real IDIR login, so there's no password grant. Instead, open the app with a
 * logged-in storage state and read the bearer token off its own API calls. Re-captured when it's about to expire.
 */
export async function liveApi(browser: Browser, who: 'user' | 'admin') {
  const context = await browser.newContext({ storageState: liveAuthFile(who) });
  let token: { value: string; expiresAt: number } | undefined;
  const capture = async () => {
    const page = await context.newPage();
    const req = page.waitForRequest((r) => r.url().includes('/api/') && !!r.headers()['authorization']);
    await page.goto(live.appUrl);
    const value = (await req).headers()['authorization'].replace(/^Bearer /, '');
    await page.close();
    const { exp } = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
    return { value, expiresAt: exp * 1000 };
  };
  const api = await AppApi.withToken(live.appUrl, `live ${who}`, async () => {
    if (!token || token.expiresAt < Date.now() + 30_000) token = await capture();
    return token.value;
  });
  return {
    api,
    dispose: async () => {
      await api.dispose();
      await context.close();
    },
  };
}
