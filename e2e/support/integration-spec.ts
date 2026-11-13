import type { KcEnv } from './env';

/**
 * What an integration *is*, independent of how it gets entered. The same spec drives the UI form (pages/integration-form.ts),
 * the API arrange helper (AppApi.createIntegration) and the keycloak assertions (expectProvisioned), so a scenario is
 * described once and every layer agrees on it.
 *
 * Fields left undefined are simply not touched in the form. That's how conditional fields are handled: a service account
 * spec has no `idps` or `redirectUris`, so nothing tries to fill them — no if-chains mirroring the schema.
 */
export interface IntegrationSpec {
  protocol: 'oidc' | 'saml';
  /** OIDC only. */
  authType?: 'browser-login' | 'service-account' | 'both';
  /** OIDC browser-login only. */
  publicAccess?: boolean;
  /** IdP keys as stored by the app (see app/helpers/meta.ts idpMap). Not applicable to service accounts. */
  idps?: Idp[];
  /** dev is always included by the app. */
  environments: KcEnv[];
  redirectUris?: Partial<Record<KcEnv, string[]>>;
  additionalRoleAttribute?: string;
  /** Who owns the integration: the requester alone, or a team (created via the API in arrange). */
  ownership: { kind: 'project-lead' } | { kind: 'team'; teamId?: number; teamName?: string };
}

export type Idp =
  /** IDIR - MFA. Restricted: only sso-admins can add it to new integrations. */
  | 'azureidir'
  | 'bceidbasic'
  | 'bceidbusiness'
  | 'bceidboth'
  | 'githubbcgov'
  | 'githubpublic'
  | 'digitalcredential'
  | 'bcservicescard'
  | 'social'
  | 'otp';

/** Checkbox labels on the form (app/helpers/meta.ts). */
export const idpLabels: Record<Idp, string> = {
  azureidir: 'IDIR - MFA',
  bceidbasic: 'Basic BCeID',
  bceidbusiness: 'Business BCeID',
  bceidboth: 'Basic or Business BCeID',
  githubbcgov: 'GitHub BC Gov',
  githubpublic: 'GitHub',
  digitalcredential: 'Digital Credential',
  bcservicescard: 'BC Services Card',
  social: 'Social',
  otp: 'One Time Passcode',
};

/**
 * Whether an IdP is withheld from the keycloak client in `env` until an SSO admin approves it.
 * BCeID needs approval in every environment; the other restricted IdPs only for prod.
 */
export const needsApproval = (idp: Idp, env: KcEnv) =>
  idp.startsWith('bceid') ||
  (env === 'prod' && (['githubbcgov', 'githubpublic', 'otp', 'bcservicescard', 'social'] as Idp[]).includes(idp));

export const envLabels: Record<KcEnv, string> = { dev: 'Development', test: 'Test', prod: 'Production' };

const uris = (envs: KcEnv[]) =>
  Object.fromEntries(
    envs.map((env) => [env, [env === 'prod' ? 'https://example.com/callback' : 'https://example.com/*']]),
  );

// --- builders -------------------------------------------------------------------------------------------------------
// Each returns a complete, valid spec; tests override only what the scenario is about.

export const oidcPublic = (o: Partial<IntegrationSpec> = {}): IntegrationSpec => ({
  protocol: 'oidc',
  authType: 'browser-login',
  publicAccess: true,
  idps: ['githubbcgov'],
  environments: ['dev', 'test'],
  redirectUris: uris(o.environments ?? ['dev', 'test']),
  ownership: { kind: 'project-lead' },
  ...o,
});

export const oidcConfidential = (o: Partial<IntegrationSpec> = {}): IntegrationSpec =>
  oidcPublic({ publicAccess: false, ...o });

export const serviceAccount = (o: Partial<IntegrationSpec> = {}): IntegrationSpec => ({
  protocol: 'oidc',
  authType: 'service-account',
  environments: ['dev', 'test'],
  ownership: { kind: 'project-lead' },
  ...o,
});

export const browserAndServiceAccount = (o: Partial<IntegrationSpec> = {}): IntegrationSpec => ({
  protocol: 'oidc',
  authType: 'both',
  idps: ['bceidboth'],
  environments: ['dev', 'test'],
  redirectUris: uris(o.environments ?? ['dev', 'test']),
  ownership: { kind: 'project-lead' },
  ...o,
});

export const saml = (o: Partial<IntegrationSpec> = {}): IntegrationSpec => ({
  protocol: 'saml',
  idps: ['bceidboth'],
  environments: ['dev', 'test'],
  redirectUris: uris(o.environments ?? ['dev', 'test']),
  ownership: { kind: 'project-lead' },
  ...o,
});

export const usesBrowserLogin = (spec: IntegrationSpec) =>
  spec.protocol === 'saml' || spec.authType !== 'service-account';
export const usesServiceAccount = (spec: IntegrationSpec) =>
  spec.protocol === 'oidc' && (spec.authType === 'service-account' || spec.authType === 'both');
/** The app treats "both" as confidential; only browser-login offers the public/confidential choice. */
export const isPublicClient = (spec: IntegrationSpec) =>
  spec.protocol === 'oidc' && spec.authType === 'browser-login' && !!spec.publicAccess;
