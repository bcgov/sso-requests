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
  if (typeof error !== 'string') return '';
  return redact(` error=${error}${typeof error_description === 'string' ? ` (${error_description})` : ''}`);
};

const record = (message: string) => {
  const log = state();
  log.entries.push(`${timestamp()} ${message}`);
  if (log.entries.length > MAX_ENTRIES) log.entries = log.entries.slice(-MAX_ENTRIES);
};

// Objects (e.g. Axios errors carrying request headers, or API responses with user data) are never serialized.
const stringify = (arg: unknown) => {
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean' || arg == null) return String(arg);
  return `<${Object.prototype.toString.call(arg).slice(8, -1)}>`;
};

// _app.tsx swallows keycloak.init() failures with console.error and renders logged out, so capture those.
Cypress.on('window:before:load', (win) => {
  const original = win.console.error.bind(win.console);
  win.console.error = (...args: unknown[]) => {
    record(`console.error ${redact(args.map(stringify).join(' ')).substring(0, 300)}`);
    original(...args);
  };
});

// Page loads and iframes, which can hang if Cypress's proxy never releases their response.
const DOCUMENT_REQUEST = { headers: { 'sec-fetch-dest': /^(document|iframe)$/ } };
const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

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
  cy.intercept(DOCUMENT_REQUEST, (req) => {
    const url = new URL(req.url);
    if (KEYCLOAK_ENDPOINT.test(url.pathname)) return;
    track(req, `${req.headers['sec-fetch-dest']} ${url.host}${url.pathname.replace(GUID, '<guid>')}`);
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
