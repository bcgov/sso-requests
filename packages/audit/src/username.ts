import type { TargetType } from './vocabulary';

// Keycloak stores usernames lowercased, so the same person can arrive as
// `ABC@idir` from the API and `abc@idir` from the app. Both must resolve to
// one `target_id`, or "everything that happened to this user" misses rows.
export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

const SERVICE_ACCOUNT_PREFIX = 'service-account-';

// Keycloak names a client's service account user `service-account-<client id>`.
export const serviceAccountUsername = (clientId: string): string =>
  normalizeUsername(`${SERVICE_ACCOUNT_PREFIX}${clientId}`);

export type RoleMappingTarget = { targetType: Extract<TargetType, 'user' | 'service-account'>; targetId: string };

/**
 * The target of a role assignment. The API accepts a client id in place of a
 * username to mean that client's own service account, so pass the integration's
 * client id to resolve that case the way the API does.
 */
export const roleMappingTarget = (username: string, clientId?: string): RoleMappingTarget => {
  const normalized = normalizeUsername(username);
  if (clientId && normalized === normalizeUsername(clientId)) {
    return { targetType: 'service-account', targetId: serviceAccountUsername(clientId) };
  }
  if (normalized.startsWith(SERVICE_ACCOUNT_PREFIX)) return { targetType: 'service-account', targetId: normalized };
  return { targetType: 'user', targetId: normalized };
};
