import { test as base, expect, Page } from '@playwright/test';
import { AppApi } from './support/api';
import { authFile, Role } from './support/env';
import { Keycloaks } from './support/keycloak';
import { MyDashboard } from './pages/dashboard';

/**
 * Things are tracked by their (unique) name rather than id, so a test that fails before it learns the id — e.g.
 * mid-form after the draft autosaved, or right after a UI create — still gets cleaned up.
 */
type Created = { kind: 'integration' | 'team'; name: string; owner: Role };

type Fixtures = {
  /** API client as the test's main user (`e2e-user`). */
  api: AppApi;
  /** API client for any seeded role; cached per test. */
  apiAs: (role: Role) => Promise<AppApi>;
  kc: Keycloaks;
  /** A name unique to this test run, safe for parallel workers and repeats. */
  uniqueName: (label: string) => string;
  /** Register something the test created; it's deleted through the API after the test, pass or fail. */
  track: (item: Created) => void;
  dashboard: MyDashboard;
  /** A page in a separate browser context logged in as `role`, for tests that involve more than one person. */
  pageAs: (role: Role) => Promise<Page>;
};

export const test = base.extend<Fixtures, { workerKc: Keycloaks }>({
  // Logged in as the regular user unless a test opts into another role via test.use({ storageState: authFile(...) }).
  storageState: authFile('user'),

  workerKc: [async ({}, use) => use(new Keycloaks()), { scope: 'worker' }],
  kc: async ({ workerKc }, use) => use(workerKc),

  apiAs: async ({}, use) => {
    const clients = new Map<Role, AppApi>();
    await use(async (role) => {
      if (!clients.has(role)) clients.set(role, await AppApi.create(role));
      return clients.get(role)!;
    });
    for (const c of clients.values()) await c.dispose();
  },

  api: async ({ apiAs }, use) => use(await apiAs('user')),

  uniqueName: async ({}, use, testInfo) => {
    let n = 0;
    const run = Date.now().toString(36);
    await use((label) => `e2e ${label} ${run}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}-${n++}`);
  },

  track: async ({ apiAs }, use) => {
    const created: Created[] = [];
    await use((item) => created.push(item));
    // Integrations before teams: a team can't be deleted while it still owns integrations.
    const order = [...created.filter((c) => c.kind === 'integration'), ...created.filter((c) => c.kind === 'team')];
    const errors: string[] = [];
    for (const item of order) {
      const api = await apiAs(item.owner);
      try {
        if (item.kind === 'integration') {
          const mine = await api.listRequests();
          for (const r of mine.filter((r) => r.projectName === item.name && !r.archived)) {
            // Deleting mid-provisioning needs an admin force-delete; wait for the workflow to settle instead.
            await api.waitForSettled(r.id);
            await api.deleteRequest(r.id);
          }
        } else {
          const team = (await api.listTeams()).find((t) => t.name === item.name);
          if (team) await api.deleteTeam(team.id);
        }
      } catch (e) {
        errors.push(`${item.kind} "${item.name}": ${(e as Error).message}`);
      }
    }
    // Don't mask the real failure, but don't let cleanup failures go unnoticed either.
    if (errors.length) console.warn(`cleanup failed:\n${errors.join('\n')}`);
  },

  dashboard: async ({ page }, use) => use(new MyDashboard(page)),

  pageAs: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
    await use(async (role) => {
      const context = await browser.newContext({ storageState: authFile(role) });
      contexts.push(context);
      return context.newPage();
    });
    for (const c of contexts) await c.close();
  },
});

export { expect };
