import KcAdminClient from '@keycloak/keycloak-admin-client';
import type ClientRepresentation from '@keycloak/keycloak-admin-client/lib/defs/clientRepresentation.js';
import { expect } from '@playwright/test';
import { ci, KcEnv } from './env';
import {
  Idp,
  IntegrationSpec,
  isPublicClient,
  needsApproval,
  usesBrowserLogin,
  usesServiceAccount,
} from './integration-spec';

const REALM = 'standard';
const TOKEN_REFRESH_MS = 30_000;

/**
 * Admin access to the three local keycloaks, for asserting what the app actually provisioned. This is the source of
 * truth for "did the integration work" — the UI can look fine while the client is misconfigured.
 */
export class Keycloaks {
  private clients = new Map<KcEnv, { kc: KcAdminClient; authedAt: number }>();

  private async admin(env: KcEnv) {
    let entry = this.clients.get(env);
    if (!entry) {
      entry = { kc: new KcAdminClient({ baseUrl: `${ci.keycloaks[env]}/auth`, realmName: 'master' }), authedAt: 0 };
      this.clients.set(env, entry);
    }
    if (Date.now() - entry.authedAt > TOKEN_REFRESH_MS) {
      await entry.kc.auth({ grantType: 'password', clientId: 'admin-cli', ...ci.keycloakAdmin });
      entry.authedAt = Date.now();
    }
    return entry.kc;
  }

  async findClient(env: KcEnv, clientId: string): Promise<ClientRepresentation | undefined> {
    const kc = await this.admin(env);
    const [client] = await kc.clients.find({ realm: REALM, clientId });
    return client;
  }

  async defaultScopes(env: KcEnv, id: string) {
    const kc = await this.admin(env);
    const scopes = await kc.clients.listDefaultClientScopes({ realm: REALM, id });
    return scopes.map((s) => s.name!).sort();
  }

  /** Seeds a user the way a brokered IdP login would leave it (username `<guid>@<idp>`). Returns its id. */
  async createUser(
    env: KcEnv,
    user: { guid: string; idp: string; firstName: string; lastName: string; email: string },
  ) {
    const kc = await this.admin(env);
    const { id } = await kc.users.create({
      realm: REALM,
      username: `${user.guid}@${user.idp}`,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      enabled: true,
    });
    return id;
  }

  async deleteUser(env: KcEnv, id: string) {
    const kc = await this.admin(env);
    await kc.users.del({ realm: REALM, id });
  }

  /** Names of `client`'s roles mapped directly to the user. */
  async userClientRoles(env: KcEnv, userId: string, clientUuid: string) {
    const kc = await this.admin(env);
    const roles = await kc.users.listClientRoleMappings({ realm: REALM, id: userId, clientUniqueId: clientUuid });
    return roles.map((r) => r.name!).sort();
  }

  async compositeRoles(env: KcEnv, clientUuid: string, roleName: string) {
    const kc = await this.admin(env);
    const role = await kc.clients.findRole({ realm: REALM, id: clientUuid, roleName });
    if (!role?.id) return [];
    const composites = await kc.roles.getCompositeRoles({ realm: REALM, id: role.id });
    return composites.map((r) => r.name!).sort();
  }

  async createClientRole(env: KcEnv, clientUuid: string, name: string) {
    const kc = await this.admin(env);
    await kc.clients.createRole({ realm: REALM, id: clientUuid, name });
  }

  async clientRoles(env: KcEnv, id: string) {
    const kc = await this.admin(env);
    const roles = await kc.clients.listRoles({ realm: REALM, id });
    return roles.map((r) => r.name!).sort();
  }
}

/**
 * Snapshot of a provisioned client reduced to what a spec controls, so a failure diff reads like the spec.
 */
export async function provisionedShape(kc: Keycloaks, env: KcEnv, clientId: string) {
  const client = await kc.findClient(env, clientId);
  if (!client) return null;
  const scopes = await kc.defaultScopes(env, client.id!);
  return {
    protocol: client.protocol === 'saml' ? 'saml' : 'oidc',
    publicClient: !!client.publicClient,
    browserLogin: !!client.standardFlowEnabled,
    serviceAccount: !!client.serviceAccountsEnabled,
    redirectUris: [...(client.redirectUris ?? [])].sort(),
    scopes,
  };
}

/** The shape the spec says the client should have in `env`, given which restricted IdPs have been approved. */
export function expectedShape(spec: IntegrationSpec, env: KcEnv, approved: Idp[] = []) {
  const idps = (spec.idps ?? []).filter((idp) => !needsApproval(idp, env) || approved.includes(idp));
  return {
    protocol: spec.protocol,
    publicClient: isPublicClient(spec),
    browserLogin: usesBrowserLogin(spec),
    serviceAccount: usesServiceAccount(spec),
    redirectUris: usesBrowserLogin(spec) ? [...(spec.redirectUris?.[env] ?? [])].sort() : [],
    idpScopes: idps.map((idp) => (spec.protocol === 'saml' ? `${idp}-saml` : idp)).sort(),
  };
}

/**
 * Asserts each requested environment has a client matching the spec, and the others have none. Polls because
 * provisioning runs through the app's workflow queue.
 *
 * IdPs that need admin approval (see needsApproval) are expected to be absent unless listed in `approved`.
 */
export async function expectProvisioned(kc: Keycloaks, spec: IntegrationSpec, clientId: string, approved: Idp[] = []) {
  for (const env of ['dev', 'test', 'prod'] as KcEnv[]) {
    if (!spec.environments.includes(env)) {
      await expect
        .poll(() => kc.findClient(env, clientId).then((c) => c?.clientId ?? null), {
          message: `no ${env} client for ${clientId}`,
        })
        .toBeNull();
      continue;
    }

    const expected = expectedShape(spec, env, approved);
    await expect
      .poll(
        async () => {
          const actual = await provisionedShape(kc, env, clientId);
          if (!actual) return null;
          const { scopes, ...rest } = actual;
          // Clients also get base scopes (common, profile, email...), so compare only the IdP ones.
          return { ...rest, idpScopes: scopes.filter(isIdpScope) };
        },
        { message: `${env} client ${clientId} matches spec`, timeout: 30_000 },
      )
      .toEqual(expected);
  }
}

/** Asserts no environment has a client with this id (e.g. after deletion). */
export async function expectNotProvisioned(kc: Keycloaks, clientId: string) {
  for (const env of ['dev', 'test', 'prod'] as KcEnv[]) {
    await expect
      .poll(() => kc.findClient(env, clientId).then((c) => c?.clientId ?? null), {
        message: `no ${env} client for ${clientId}`,
        timeout: 30_000,
      })
      .toBeNull();
  }
}

const IDP_SCOPE =
  /^(idir|azureidir|bcgovidir|bceidbasic|bceidbusiness|bceidboth|githubbcgov|githubpublic|digitalcredential|otp|social|bcsc-.*)(-saml)?$/;
const isIdpScope = (scope: string) => IDP_SCOPE.test(scope);
