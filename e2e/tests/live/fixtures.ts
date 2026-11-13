import { test as base, expect, Page } from '@playwright/test';
import { AdminDashboard } from '../../pages/admin-dashboard';
import { loginAzureIdir, loginBceid, loginGithub } from '../../pages/idp-login';
import { AppApi } from '../../support/api';
import { Idp, IntegrationSpec, needsApproval, oidcPublic } from '../../support/integration-spec';
import { live, liveApi, liveAuthFile, liveUser } from '../../support/live';

type LiveIntegration = { id: number; name: string; clientId: string };

type Fixtures = {
  /**
   * Creates a dev-only integration on the sandbox (as the sso-admin, who may add restricted IdPs like IDIR),
   * approves whatever it needs, and deletes it after the test.
   */
  integration: (label: string, idps: Idp[], overrides?: Partial<IntegrationSpec>) => Promise<LiveIntegration>;
  /** Completes the login form of `idp` with its live test account. */
  loginWith: (page: Page, idp: Idp) => Promise<void>;
};

export const test = base.extend<Fixtures, { adminApi: AppApi }>({
  // Live tests start from a clean browser unless they opt in to a saved session.
  storageState: { cookies: [], origins: [] },

  adminApi: [
    async ({ browser }, use) => {
      const { api, dispose } = await liveApi(browser, 'admin');
      await use(api);
      await dispose();
    },
    { scope: 'worker' },
  ],

  integration: async ({ adminApi, browser }, use, testInfo) => {
    const created: LiveIntegration[] = [];
    await use(async (label, idps, overrides = {}) => {
      // Mixed case on purpose: the login page header must keep the name's capitalisation.
      const name = `E2E Live ${label} ${Date.now().toString(36)}-${testInfo.workerIndex}`;
      const spec = oidcPublic({ idps, environments: ['dev'], ...overrides });
      const { id, clientId } = await adminApi.createIntegration(spec, name);
      created.push({ id, name, clientId });

      if (idps.some((idp) => needsApproval(idp, 'dev'))) {
        const context = await browser.newContext({ storageState: liveAuthFile('admin') });
        const admin = new AdminDashboard(await context.newPage());
        await admin.open(name);
        await admin.approveBceid(['dev']);
        await context.close();
        await adminApi.waitForStatus(id, 'applied');
      }
      return { id, name, clientId };
    });
    for (const { id } of created) {
      await adminApi.waitForSettled(id).catch(() => {});
      await adminApi.deleteRequest(id).catch((e) => console.warn(`cleanup of ${id} failed: ${e.message}`));
    }
  },

  loginWith: async ({}, use) => {
    await use(async (page, idp) => {
      switch (idp) {
        case 'azureidir':
          return loginAzureIdir(page, liveUser('azureidir', live.cssUser));
        case 'bceidbasic':
          return loginBceid(page, liveUser('bceidbasic'), 'Basic');
        case 'bceidbusiness':
          return loginBceid(page, liveUser('bceidbusiness'), 'Business');
        case 'githubbcgov':
          return loginGithub(page, liveUser('githubbcgov'));
        default:
          throw new Error(`no live login for ${idp}`);
      }
    });
  },
});

export { expect };
