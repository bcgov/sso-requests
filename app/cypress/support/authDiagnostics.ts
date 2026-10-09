// Records Keycloak OIDC traffic so that when the app unexpectedly renders as logged out we can tell why
// (e.g. check-sso returned login_required, the code exchange failed, or the app called the logout endpoint).
// Codes, tokens and query strings are never recorded.

const OIDC_ENDPOINT = /\/protocol\/openid-connect\/(auth|token|logout)(\?|$)/;
const MAX_ENTRIES = 50;

let entries: string[] = [];

const timestamp = () => new Date().toISOString().substring(11, 23);

// check-sso responds with a redirect whose fragment holds either `code` or `error` (e.g. login_required).
const describeRedirect = (location?: string | string[]) => {
  const value = Array.isArray(location) ? location[0] : location;
  if (!value) return '';
  const params = new URLSearchParams(value.split('#')[1] || value.split('?')[1] || '');
  const error = params.get('error');
  if (error) return ` error=${error}`;
  return params.has('code') ? ' code=<received>' : '';
};

const describeErrorBody = (body: unknown) => {
  if (!body || typeof body !== 'object') return '';
  const { error, error_description } = body as Record<string, string>;
  return error ? ` error=${error}${error_description ? ` (${error_description})` : ''}` : '';
};

const record = (message: string) => {
  entries.push(`${timestamp()} ${message}`);
  if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
};

export const startAuthDiagnostics = () => {
  entries = [];
  cy.intercept({ url: OIDC_ENDPOINT }, (req) => {
    const path = new URL(req.url).pathname;
    record(`${req.method} ${path}`);
    req.on('response', (res) => {
      const detail = res.statusCode >= 400 ? describeErrorBody(res.body) : describeRedirect(res.headers['location']);
      record(`  -> ${res.statusCode}${detail}`);
    });
  }).as('keycloak');
};

export const dumpAuthDiagnostics = (reason: string) => {
  const lines = entries.length ? entries : ['(no Keycloak OIDC requests recorded)'];
  return cy.task('log', [`[auth] ${reason}`, ...lines.map((line) => `[auth]   ${line}`)].join('\n'), { log: false });
};
