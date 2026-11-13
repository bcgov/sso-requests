import { expect, test as setup } from '@playwright/test';
import { loginAzureIdir } from '../../pages/idp-login';
import { live, liveAuthFile, liveUser } from '../../support/live';

// Real Azure IDIR + MFA login into the sandbox CSS app, once per account. Saves both the keycloak and Microsoft
// session cookies, so later tests start logged in.
for (const who of ['user', 'admin'] as const) {
  setup(`log in to the CSS app as ${who}`, async ({ page }) => {
    await page.goto(live.appUrl);
    await page.getByTestId('desktop-login-button').click();
    await loginAzureIdir(page, liveUser('azureidir', who === 'admin' ? live.cssAdmin : live.cssUser));
    await expect(page.getByTestId('desktop-logout-button')).toBeVisible({ timeout: 30_000 });
    await page.context().storageState({ path: liveAuthFile(who) });
  });
}
