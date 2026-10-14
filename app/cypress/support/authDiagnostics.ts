import type { CyHttpMessages } from 'cypress/types/net-stubbing';

// Records Keycloak traffic and app console errors so that when the app unexpectedly renders as logged out we can tell
// why (e.g. keycloak.init() timed out on the 3rd-party-cookie iframe, check-sso returned login_required, the code
// exchange failed, or the app called the logout endpoint). Codes, tokens and query strings are never recorded.

// The support file and each spec are bundled separately, so module-level state would not be shared between them.
// Keep the log on the Cypress object, which both bundles see.
type DiagnosticsState = { entries: string[]; pending: Map<number, { label: string; started: number }> };
const state = (): DiagnosticsState => {
  const holder = Cypress as unknown as { __authDiagnostics?: DiagnosticsState };
  holder.__authDiagnostics ??= { entries: [], pending: new Map() };
  return holder.__authDiagnostics;
};

const KEYCLOAK_ENDPOINT = /\/realms\/[^/]+\/protocol\/openid-connect\/([\w-]+(?:\/[\w.-]+)?)/;
const MAX_ENTRIES = 80;

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

// CI logs are public: strip anything that could be a credential or identify the test user.
const redact = (text: string) =>
  text
    .replace(/eyJ[\w-]*\.[\w-]*\.?[\w-]*/g, '<jwt>')
    .replace(/\b(bearer|basic)\s+\S+/gi, '$1 <redacted>')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>')
    .replace(/https?:\/\/\S+/g, (url) => url.split(/[?#]/)[0])
    .replace(
      /\b(code|state|session_state|nonce|token|refresh_token|id_token|access_token)=[^\s&"]+/gi,
      '$1=<redacted>',
    );

const describeErrorBody = (body: unknown) => {
  if (!body || typeof body !== 'object') return '';
  const { error, error_description } = body as Record<string, unknown>;
  if (typeof error !== 'string' || !/^\w{1,40}$/.test(error)) return '';
  // Keycloak's descriptions are short static phrases (e.g. "Code not valid"); anything else could carry user data.
  const safeDescription = typeof error_description === 'string' && /^[A-Za-z ]{1,60}$/.test(error_description);
  return ` error=${error}${safeDescription ? ` (${error_description})` : ''}`;
};

const record = (message: string) => {
  const log = state();
  log.entries.push(`${timestamp()} ${message}`);
  if (log.entries.length > MAX_ENTRIES) log.entries = log.entries.slice(-MAX_ENTRIES);
};

const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// CI logs are public and console.error arguments can carry anything (API responses, user details), so only messages
// known to be static library text are logged; anything else is reduced to a placeholder.
const KNOWN_SAFE_MESSAGES = [
  // axios / fetch
  /^Request failed with status code \d{3}$/,
  /^Network Error$/,
  /^timeout of \d+ms exceeded$/,
  /^Request aborted$/,
  /^canceled$/,
  /^Failed to fetch$/,
  /^Load failed$/,
  /^NetworkError when attempting to fetch resource\.$/,
  // keycloak-js
  /^Timeout when waiting for 3rd party check iframe message\.$/,
  /^Promise is not settled within timeout of \d+ms$/,
  /^Server responded with an invalid status\.$/,
  /^Error while checking login iframe$/,
  /^Invalid nonce\.$/,
  /^Not authenticated$/,
  /^Unable to process login\.$/,
  /^Unable to update token, no refresh token available\.$/,
  /^Unable to decode token, payload (not found|is not a valid (Base64URL|JSON) value)\.$/,
  /^Failed to generate PKCE challenge\.$/,
  /^Web Crypto API is not available\.$/,
  /^A 'Keycloak' instance can only be initialized once\.$/,
];

const describeMessage = (message: string) =>
  KNOWN_SAFE_MESSAGES.some((pattern) => pattern.test(message)) ? message : '<message omitted>';

// Errors from the page come from its own window, so `instanceof Error` (this window's Error) is false for them.
const isErrorLike = (arg: object): arg is { name?: unknown; message?: unknown } =>
  Object.prototype.toString.call(arg) === '[object Error]' || ('name' in arg && 'message' in arg);

// Error names and OAuth-style error codes are safe identifiers; anything else that isn't one is not logged.
const safeIdentifier = (value: unknown) => (typeof value === 'string' && /^\w{1,40}$/.test(value) ? value : undefined);

// Objects (e.g. Axios errors carrying request headers, or API responses with user data) are never serialized: only an
// error's name and allowlisted message, or an OAuth error code, are logged.
const stringify = (arg: unknown) => {
  if (typeof arg === 'string') return KNOWN_SAFE_MESSAGES.some((pattern) => pattern.test(arg)) ? arg : '<string>';
  if (typeof arg === 'boolean' || arg == null) return String(arg);
  if (typeof arg !== 'object') return `<${typeof arg}>`;
  const type = Object.prototype.toString.call(arg).slice(8, -1);
  if (isErrorLike(arg)) {
    const name = safeIdentifier(arg.name) ?? type;
    return typeof arg.message === 'string' ? `${name}: ${describeMessage(arg.message)}` : name;
  }
  const error = safeIdentifier((arg as { error?: unknown }).error);
  return error ? `<${type} error=${error}>` : `<${type}>`;
};

// _app.tsx swallows keycloak.init() failures with console.error and renders logged out, so capture those.
Cypress.on('window:before:load', (win) => {
  const original = win.console.error.bind(win.console);
  win.console.error = (...args: unknown[]) => {
    record(`console.error ${args.map(stringify).join(' ').substring(0, 300)}`);
    original(...args);
  };
});

// Page loads and iframes on the app and playground, which can hang if Cypress's proxy never releases their response.
// Matched by path (no file extension, so not static assets) and then by the Accept header that browsers send for
// navigations; matching on sec-fetch-dest never fired.
const PLAYGROUND_ORIGIN = 'https://bcgov.github.io';
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const documentUrlMatcher = () => {
  const host = Cypress.expose('host') || Cypress.config('baseUrl');
  const origins = [PLAYGROUND_ORIGIN, ...(host ? [new URL(host).origin] : [])].map(escapeRegExp);
  return new RegExp(`^(${origins.join('|')})(/(?!_next/)[^.?#]*)?([?#].*)?$`);
};

let nextRequestId = 0;

// 'response' fires when Keycloak/the server answers; 'after:response' only once the browser has received it. Cypress
// holds some responses in between (cross-origin Set-Cookie), so anything still pending was never delivered.
const track = (req: CyHttpMessages.IncomingHttpRequest, label: string) => {
  const id = ++nextRequestId;
  const started = Date.now();
  const { pending } = state();
  pending.set(id, { label, started });
  record(`${req.method} ${label}`);
  req.on('after:response', () => {
    pending.delete(id);
  });
  req.on('response', (res) => {
    const detail = res.statusCode >= 400 ? describeErrorBody(res.body) : describeRedirect(res.headers['location']);
    record(`  <- ${label} ${res.statusCode} in ${Date.now() - started}ms${detail}`);
  });
};

export const startAuthDiagnostics = () => {
  state().entries = [];
  state().pending.clear();
  cy.intercept({ url: KEYCLOAK_ENDPOINT }, (req) => {
    const endpoint = KEYCLOAK_ENDPOINT.exec(new URL(req.url).pathname)?.[1] ?? 'unknown';
    // Answered by the stub in e2e.ts, so it never reaches Keycloak.
    if (endpoint === '3p-cookies/step1.html') return record(`${req.method} ${endpoint} (stubbed)`);
    track(req, endpoint);
  });
  cy.intercept({ method: 'GET', url: documentUrlMatcher() }, (req) => {
    const accept = req.headers['accept'];
    if (!(Array.isArray(accept) ? accept.join(',') : accept || '').includes('text/html')) return;
    const url = new URL(req.url);
    track(req, `page ${url.host}${redact(url.pathname).replace(GUID, '<guid>')}`);
  });
};

const formatDiagnostics = (reason: string) => {
  const { entries, pending } = state();
  const now = Date.now();
  const lines = [
    `[auth] ${reason}`,
    ...(entries.length ? entries : ['(nothing recorded)']).map((line) => `[auth]   ${line}`),
    ...Array.from(pending.values()).map(
      ({ label, started }) =>
        `[auth]   NOT DELIVERED TO BROWSER after ${Math.round((now - started) / 1000)}s: ${label}`,
    ),
  ];
  return lines.join('\n');
};

export const dumpAuthDiagnostics = (reason: string) => cy.task('log', formatDiagnostics(reason), { log: false });

// Any failure (page load timeouts, failed session setup, ...) gets the recorded traffic appended to its message, so it
// shows up in the CI output without needing a cy command to run.
Cypress.on('fail', (err) => {
  err.message = `${err.message}\n\n${formatDiagnostics('Network activity before failure')}`;
  throw err;
});
