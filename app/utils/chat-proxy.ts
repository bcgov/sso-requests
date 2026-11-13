/**
 * Server-side proxy to the CSS Assistant (the sso-rag API).
 *
 * The browser only talks to this app's /api/chat routes: the production CSP blocks calls to other origins, and the
 * RAG API keeps a conversation under a SameSite=Lax HttpOnly cookie that a browser would not send cross-site. The
 * proxy keeps that upstream session id in this app's own HttpOnly cookie and sends upstream only the headers the
 * RAG API needs, so no other cookie or credential of this app ever leaves it.
 *
 * Only signed-in users can chat. The cookie is tied to the user it was issued to, so another user signing in on the
 * same browser starts a new conversation instead of continuing (and seeing the context of) the previous user's one.
 *
 * The RAG API itself only accepts calls with this app's service-account token (utils/rag-token.ts).
 */
import { createHash } from 'node:crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Session } from '@app/shared/interfaces';
import { getRagAccessToken, invalidateRagAccessToken, ragTokenConfigured } from '@app/utils/rag-token';

export const UPSTREAM_SESSION_COOKIE = 'strands_session';
export const CHAT_SESSION_COOKIE = 'css_chat_session';
export const TAB_ID_HEADER = 'x-tab-id';

export const DEFAULT_MAX_PROMPT_LENGTH = 500;
export const UPSTREAM_TIMEOUT_MS = 300_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Upstream issues `<prefix><uuid>`; anything else is dropped so a cookie value can't inject header content.
const SESSION_VALUE_PATTERN = /^[\w-]{1,128}$/;

// Only plain digits: a value like "3.6e+06" (how Helm renders a large unquoted number) must not parse as 3.
export const positiveInt = (value: string | undefined, fallback: number) => {
  const trimmed = (value ?? '').trim();
  if (!/^\d+$/.test(trimmed)) return fallback;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const chatConfig = () => {
  const ragApiUrl = (process.env.RAG_API_URL || '').trim();
  return {
    // The RAG API rejects calls without a service-account token, so the assistant is off until one can be fetched.
    enabled: process.env.CHATBOT_ENABLED === 'true' && ragApiUrl !== '' && ragTokenConfigured(),
    ragApiUrl,
    maxPromptLength: positiveInt(process.env.CHATBOT_MAX_PROMPT_LENGTH, DEFAULT_MAX_PROMPT_LENGTH),
  };
};

/** `path` is relative to the RAG API base, which includes the API Gateway stage (e.g. `/sandbox/`). */
export const upstreamUrl = (path: string) => {
  const base = chatConfig().ragApiUrl;
  return new URL(path, base.endsWith('/') ? base : `${base}/`).toString();
};

/**
 * Calls the RAG API with the service-account token. If the RAG API rejects the token (401: revoked, or the client's
 * secret was rotated), the cached token is dropped and the call is retried once with a new one; nothing has run
 * upstream at that point, so the retry is safe. Throws if no token can be fetched.
 */
export const fetchUpstream = async (path: string, init: RequestInit & { headers: Record<string, string> }) => {
  const send = async () => {
    const token = await getRagAccessToken();
    const response = await fetch(upstreamUrl(path), {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}` },
    });
    return { response, token };
  };

  const first = await send();
  if (first.response.status !== 401) return first.response;
  invalidateRagAccessToken(first.token);
  await first.response.body?.cancel().catch(() => undefined);
  return (await send()).response;
};

export const validTabId = (req: NextApiRequest) => {
  const header = req.headers[TAB_ID_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return value && UUID_PATTERN.test(value) ? value : undefined;
};

/** The signed-in user the chat belongs to: the token's subject, or the IDIR GUID if a token has none. */
export const chatUserId = (session: Session) => session.sub || session.idir_userid;

// Short, non-reversible tag of the user id, so the cookie doesn't carry the id itself.
const ownerTag = (userId: string) => createHash('sha256').update(userId).digest('hex').slice(0, 16);

/** The upstream session id from this app's cookie, if the cookie was issued to this user. */
const ownedSessionId = (req: NextApiRequest, userId: string) => {
  const cookie = req.cookies?.[CHAT_SESSION_COOKIE] ?? '';
  const separator = cookie.indexOf('.');
  if (separator < 0 || cookie.slice(0, separator) !== ownerTag(userId)) return undefined;
  const sessionId = cookie.slice(separator + 1);
  return SESSION_VALUE_PATTERN.test(sessionId) ? sessionId : undefined;
};

/** Headers for an upstream call: only what the RAG API reads. */
export const upstreamHeaders = (req: NextApiRequest, userId: string, extra: Record<string, string> = {}) => {
  const headers: Record<string, string> = { ...extra };
  const sessionId = ownedSessionId(req, userId);
  if (sessionId) headers.Cookie = `${UPSTREAM_SESSION_COOKIE}=${sessionId}`;
  const tabId = validTabId(req);
  if (tabId) headers['X-Tab-Id'] = tabId;
  return headers;
};

// The cookie is only ever needed by the /api/chat routes.
const cookiePath = () => {
  try {
    return `${new URL(process.env.NEXT_PUBLIC_API_URL || '').pathname.replace(/\/$/, '')}/chat`;
  } catch {
    return '/api/chat';
  }
};

const cookieSecure = () => (process.env.NEXT_PUBLIC_APP_URL || '').startsWith('https://');

const serializeCookie = (value: string, maxAge: number) =>
  [
    `${CHAT_SESSION_COOKIE}=${value}`,
    `Path=${cookiePath()}`,
    `Max-Age=${maxAge}`,
    'HttpOnly',
    'SameSite=Lax',
    ...(cookieSecure() ? ['Secure'] : []),
  ].join('; ');

const parseUpstreamSessionCookie = (setCookie: string) => {
  const [pair, ...attributes] = setCookie.split(';').map((part) => part.trim());
  const separator = pair.indexOf('=');
  if (separator < 0 || pair.slice(0, separator) !== UPSTREAM_SESSION_COOKIE) return null;

  const value = pair.slice(separator + 1).replace(/^"|"$/g, '');
  const attribute = (name: string) =>
    attributes
      .find((a) => a.toLowerCase().startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');

  const maxAge = attribute('max-age');
  const expires = attribute('expires');
  const expired =
    !value ||
    (maxAge !== undefined && Number(maxAge) <= 0) ||
    (maxAge === undefined && expires !== undefined && Date.parse(expires) <= Date.now());
  return { value, maxAge: maxAge !== undefined ? Number(maxAge) : undefined, expired };
};

/** Mirrors the upstream session cookie (set, refresh or delete) into this app's own cookie, tagged with its user. */
export const applyUpstreamSessionCookie = (upstream: Response, res: NextApiResponse, userId: string) => {
  const setCookies = upstream.headers.getSetCookie?.() ?? [];
  for (const header of setCookies) {
    const cookie = parseUpstreamSessionCookie(header);
    if (!cookie) continue;
    if (cookie.expired) {
      res.setHeader('Set-Cookie', serializeCookie('', 0));
    } else if (SESSION_VALUE_PATTERN.test(cookie.value)) {
      res.setHeader(
        'Set-Cookie',
        serializeCookie(`${ownerTag(userId)}.${cookie.value}`, cookie.maxAge ?? 60 * 60 * 24),
      );
    }
  }
};

export const CHAT_UNAVAILABLE_MESSAGE = 'The assistant is unavailable right now. Please try again later.';
