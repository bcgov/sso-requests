import { expect, Page } from '@playwright/test';
import { ci, Role } from '../support/env';

/** Logs in through the app's real OIDC flow against the local keycloak (stock login theme on the css-app-e2e client). */
export async function loginLocal(page: Page, role: Role) {
  const { username, password } = ci.users[role];
  await page.goto('/');
  await page.getByTestId('desktop-login-button').click();
  await page.locator('#username').fill(username);
  await page.locator('#password').fill(password);
  await page.locator('#kc-login').click();
  await page.waitForURL(/\/my-dashboard/);
  await expect(page.getByTestId('desktop-logout-button')).toBeVisible();
}
