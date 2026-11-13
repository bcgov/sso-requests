import { test as setup } from '@playwright/test';
import { loginLocal } from '../../pages/login';
import { authFile, Role } from '../../support/env';

// Log each seeded user in once through the real OIDC flow and save the keycloak session cookies. keycloak-js uses
// check-sso, so a test that starts from this storage state is silently logged back in on first page load.
for (const role of ['user', 'additionalUser', 'admin'] as Role[]) {
  setup(`log in as ${role}`, async ({ page }) => {
    await loginLocal(page, role);
    await page.context().storageState({ path: authFile(role) });
  });
}
