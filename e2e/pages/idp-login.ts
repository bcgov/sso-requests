import { expect, Page } from '@playwright/test';
import type { LiveUser } from '../support/live';
import { freshTotp } from '../support/totp';

/**
 * Login forms of the real IdPs behind the sandbox keycloak. Each function starts on the IdP's page (after keycloak
 * has redirected there) and returns once the IdP has handed back to keycloak. Unlike Cypress, Playwright follows these
 * cross-origin redirects natively, so there's no cy.origin / iframe juggling.
 */

/** Microsoft Entra (Azure IDIR) with TOTP MFA. */
export async function loginAzureIdir(page: Page, user: LiveUser) {
  if (!user.otpsecret) throw new Error(`${user.username} has no otpsecret`);
  await expect(page).toHaveURL(/login\.microsoftonline\.com/);
  await page.locator('input[type="email"]').fill(user.email ?? user.username);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('input[type="password"]').fill(user.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.locator('input[type="tel"], input[name="otc"]').fill(await freshTotp(user.otpsecret));
  await page.getByRole('button', { name: 'Verify' }).click();
  // "Stay signed in?" only shows up sometimes.
  const staySignedIn = page.getByRole('button', { name: 'Yes' });
  await staySignedIn.click({ timeout: 5_000 }).catch(() => {});
  await expect(page).not.toHaveURL(/login\.microsoftonline\.com/, { timeout: 30_000 });
}

/** BCeID test environment (SiteMinder form). */
export async function loginBceid(page: Page, user: LiveUser, kind: 'Basic' | 'Business') {
  await expect(page.getByText(`Use a ${kind} BCeID`)).toBeVisible({ timeout: 20_000 });
  await page.locator('#user').fill(user.username);
  await page.locator('#password').fill(user.password);
  await page.locator('input[type="submit"]').first().click();
  // An occasional interstitial "continue" form.
  const cont = page.locator('input[type="submit"]');
  if (await cont.isVisible({ timeout: 2_000 }).catch(() => false)) await cont.click();
}

/** GitHub with TOTP 2FA. */
export async function loginGithub(page: Page, user: LiveUser) {
  if (!user.otpsecret) throw new Error(`${user.username} has no otpsecret`);
  await page.locator('#login_field').fill(user.username);
  await page.locator('#password').fill(user.password);
  await page.locator('input[type="submit"]').click();
  await page.locator('#app_totp').fill(await freshTotp(user.otpsecret));
  // GitHub auto-submits on the 6th digit; the button only matters if it doesn't.
  await page
    .getByRole('button', { name: 'Verify' })
    .click({ timeout: 3_000 })
    .catch(() => {});
}
