/**
 * Service-account access token for the sso-rag API.
 *
 * The RAG API requires a Keycloak bearer token. The chat proxy gets one with the client-credentials grant
 * (RAG_TOKEN_URL, RAG_CLIENT_ID, RAG_CLIENT_SECRET) and reuses it until shortly before it expires, so a message
 * doesn't cost an extra round trip to Keycloak. Concurrent requests share one in-flight fetch.
 */
import { logger } from '@app/utils/logger';

const log = logger.child({ module: 'rag-token' });

// Refresh this long before expiry, so a token never expires between being read and reaching the RAG API.
const EXPIRY_MARGIN_MS = 30_000;
// Used when Keycloak's response has no usable expires_in.
const DEFAULT_LIFETIME_SECONDS = 60;
const TOKEN_REQUEST_TIMEOUT_MS = 10_000;

export const ragTokenConfig = () => ({
  tokenUrl: (process.env.RAG_TOKEN_URL || '').trim(),
  clientId: (process.env.RAG_CLIENT_ID || '').trim(),
  clientSecret: process.env.RAG_CLIENT_SECRET || '',
});

export const ragTokenConfigured = () => {
  const { tokenUrl, clientId, clientSecret } = ragTokenConfig();
  return tokenUrl !== '' && clientId !== '' && clientSecret !== '';
};

let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<string> | null = null;

const requestToken = async (): Promise<string> => {
  const { tokenUrl, clientId, clientSecret } = ragTokenConfig();
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    signal: AbortSignal.timeout(TOKEN_REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    log.error({ status: response.status }, 'RAG service account token request was rejected');
    throw new Error('RAG service account token request failed');
  }

  const body = await response.json().catch(() => null);
  const token = body?.access_token;
  if (typeof token !== 'string' || token === '') {
    log.error('RAG service account token response had no access token');
    throw new Error('RAG service account token request failed');
  }

  const lifetime = Number(body.expires_in);
  const lifetimeMs = (Number.isFinite(lifetime) && lifetime > 0 ? lifetime : DEFAULT_LIFETIME_SECONDS) * 1000;
  // Short-lived tokens are still reused for half their lifetime rather than refetched on every request.
  cached = { token, expiresAt: Date.now() + Math.max(lifetimeMs - EXPIRY_MARGIN_MS, lifetimeMs / 2) };
  return token;
};

/** A valid access token for the RAG API, from the cache or freshly fetched. Throws if Keycloak can't issue one. */
export const getRagAccessToken = async (): Promise<string> => {
  if (cached && Date.now() < cached.expiresAt) return cached.token;
  inFlight ??= requestToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

/** Forgets the cached token, e.g. after the RAG API rejected it, so the next call fetches a new one. */
export const invalidateRagAccessToken = (token?: string) => {
  if (!token || cached?.token === token) cached = null;
};
