import { APIRequestContext, expect, request } from '@playwright/test';
import { ci, KcEnv, Role } from './env';
import { IntegrationSpec } from './integration-spec';

/** The request record fields a spec controls. */
export const specToRequestFields = (spec: IntegrationSpec) => ({
  protocol: spec.protocol,
  authType: spec.protocol === 'oidc' ? spec.authType : 'browser-login',
  publicAccess: spec.publicAccess ?? false,
  devIdps: spec.idps ?? [],
  environments: spec.environments,
  additionalRoleAttribute: spec.additionalRoleAttribute ?? '',
  ...Object.fromEntries(
    (['dev', 'test', 'prod'] as KcEnv[]).map((env) => [`${env}ValidRedirectUris`, spec.redirectUris?.[env] ?? []]),
  ),
});

/**
 * Thin client for the app's own API, authenticated as one of the seeded users via a password grant against the local
 * keycloak. Used to arrange state a test isn't about (teams, approvals) and to clean up afterwards, so UI steps are
 * reserved for the behaviour under test.
 */
export class AppApi {
  private constructor(
    private readonly ctx: APIRequestContext,
    /** Used in error messages. */
    readonly label: string,
    private readonly bearer: () => Promise<string>,
  ) {}

  /** CI tier: a seeded local user, authenticated with a password grant against the local keycloak. */
  static async create(role: Role) {
    const ctx = await request.newContext({ baseURL: `${ci.appUrl}/api/` });
    let token: { value: string; expiresAt: number } | undefined;
    const bearer = async () => {
      if (token && token.expiresAt > Date.now() + 10_000) return token.value;
      const { username, password } = ci.users[role];
      const res = await ctx.post(`${ci.ssoUrl}/realms/standard/protocol/openid-connect/token`, {
        form: { grant_type: 'password', client_id: ci.ssoClientId, username, password, scope: 'openid' },
      });
      expect(res, `password grant for ${username}`).toBeOK();
      const body = await res.json();
      token = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
      return token.value;
    };
    return new AppApi(ctx, role, bearer);
  }

  /** Any tier: bring your own token source (e.g. the live tier captures it from a logged-in browser). */
  static async withToken(appUrl: string, label: string, bearer: () => Promise<string>) {
    return new AppApi(await request.newContext({ baseURL: `${appUrl}/api/` }), label, bearer);
  }

  async dispose() {
    await this.ctx.dispose();
  }

  private async call<T>(
    method: 'get' | 'post' | 'put' | 'delete',
    path: string,
    opts: { data?: unknown; params?: Record<string, string | number> } = {},
  ) {
    const res = await this.ctx[method](path, {
      headers: { Authorization: `Bearer ${await this.bearer()}` },
      ...opts,
    });
    if (!res.ok()) {
      throw new Error(
        `${method.toUpperCase()} /api/${path} as ${this.label} -> ${res.status()}: ${(await res.text()).slice(0, 600)}`,
      );
    }
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  // --- requests (integrations) ---
  getRequest(id: number) {
    return this.call<Integration>('post', 'request', { data: { requestId: id } });
  }

  listRequests() {
    return this.call<Integration[]>('get', 'requests', { params: { include: 'active' } });
  }

  deleteRequest(id: number) {
    return this.call('delete', 'requests', { params: { id } });
  }

  /**
   * Arrange helper: creates and submits an integration from a spec the same way the form does (draft, then submit),
   * and waits until it's applied. Use when the integration's creation isn't what the test is about.
   */
  async createIntegration(spec: IntegrationSpec, projectName: string) {
    const ownership =
      spec.ownership.kind === 'team'
        ? { usesTeam: true, teamId: String(spec.ownership.teamId), projectLead: false }
        : { usesTeam: false, projectLead: true };
    const draft = await this.call<Integration>('post', 'requests', {
      data: { projectName, serviceType: 'gold', ...ownership },
    });
    // Same normalisation the app's client does before PUT (app/services/request.ts updateRequest).
    const { user, lastChanges, team, permissions, userTeamRole, ...record } = draft as Record<string, unknown>;
    await this.call('put', 'requests', {
      params: { submit: 'true' },
      data: {
        ...record,
        ...ownership,
        ...specToRequestFields(spec),
        primaryEndUsers: [],
        primaryEndUsersOther: '',
        agreeWithTerms: true,
      },
    });
    await this.waitForStatus(draft.id, 'applied');
    return this.getRequest(draft.id);
  }

  /** Waits until the request isn't mid-workflow (app/helpers/transitions.ts IN_FLIGHT). */
  async waitForSettled(id: number) {
    await expect
      .poll(() => this.getRequest(id).then((r) => r?.status), { timeout: 60_000, message: `request ${id} settles` })
      .not.toMatch(/^(submitted|planned)$/);
  }

  async waitForStatus(id: number, status: string) {
    await expect
      .poll(() => this.getRequest(id).then((r) => r?.status), {
        timeout: 60_000,
        message: `request ${id} -> ${status}`,
      })
      .toBe(status);
  }

  // --- teams ---
  createTeam(name: string, members: { email: string; role: 'admin' | 'member' }[] = []) {
    return this.call<{ id: number; name: string }>('post', 'teams', {
      data: { name, members: members.map((m) => ({ idirEmail: m.email, role: m.role })) },
    });
  }

  listTeams() {
    return this.call<{ id: number; name: string }[]>('get', 'teams');
  }

  deleteTeam(id: number) {
    return this.call('delete', `teams/${id}`);
  }
}

/** The subset of the integration record tests assert on. */
export interface Integration {
  id: number;
  projectName: string;
  clientId: string;
  status: string;
  archived: boolean;
  protocol: 'oidc' | 'saml';
  authType: string;
  publicAccess: boolean;
  usesTeam: boolean;
  teamId?: number;
  devIdps: string[];
  environments: string[];
  devValidRedirectUris: string[];
  testValidRedirectUris: string[];
  prodValidRedirectUris: string[];
  [key: string]: unknown;
}
