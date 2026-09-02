export type ValidationStatus = 'PASS' | 'FAIL' | 'SKIPPED' | 'PLANNED';

export interface ValidationResult {
  name: string;
  method: string;
  originalEndpoint: string;
  endpoint: string;
  status: ValidationStatus;
  httpStatus?: number;
  durationMs: number;

  requestId?: string;
  clientRequestId?: string;
  correlationId?: string;
  errorCode?: string;

  details: string;
  requiredPermissions: string[];
  possibleSolutions: string[];
  resourceDependency?: string;
}

export interface ResourceActivity {
  type: string;
  id: string;
  displayName?: string;
  createdAt?: string;
  cleanedAt?: string;
  cleanupStatus?: string;
}

export interface ValidationContext {
  dryRun: boolean;
  baseUrl: string;
  token: string;
  prefix: string;
  runId: string;
  config: ValidatorConfig;

  application?: Record<string, any>;
  servicePrincipal?: Record<string, any>;
  secretKeyId?: string;

  results: ValidationResult[];
  activities: ResourceActivity[];

  /**
   * Contains only IDs returned by successful create calls from this run.
   * Cleanup and deletion operations must check this collection first.
   */
  ownedResourceIds: Set<string>;
}

export interface ValidatorConfig {
  testPrefix: string;

  redirectUris: {
    web: string[];
    spa: string[];
  };

  signInAudience: string;

  optionalClaims: {
    idToken: OptionalClaim[];
    accessToken: OptionalClaim[];
    saml2Token: OptionalClaim[];
  };

  secretLifetimeMinutes: number;
  tests?: string[];
}

export interface OptionalClaim {
  name: string;
  source?: string | null;
  essential?: boolean;
  additionalProperties?: string[];
}
