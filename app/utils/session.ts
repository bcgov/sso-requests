import { KeycloakTokenParsed } from 'keycloak-js';

// Mirrors the server-side check in utils/authenticate.ts, which rejects tokens without a usable email.
export const hasValidEmail = (session?: KeycloakTokenParsed | null) => {
  const email = session?.email;
  return typeof email === 'string' && email.trim().length > 0;
};
