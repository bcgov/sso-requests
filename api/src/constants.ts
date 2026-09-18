// Environment is a deployment target, not a trust boundary: no team, role or
// organization link has ever varied by it, so it is deliberately not a scope
// dimension anywhere in authorization. It stays a route parameter because it selects which
// Keycloak realm a call is made against, and an unrecognised value must be
// rejected rather than carried into that call.
export const ENVIRONMENTS = ['dev', 'test', 'prod'] as const;

export type Environment = typeof ENVIRONMENTS[number];

export const isValidEnvironment = (value: unknown): value is Environment =>
  typeof value === 'string' && (ENVIRONMENTS as readonly string[]).includes(value);
