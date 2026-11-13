import { expect, test } from '../../fixtures';

/** Cheap checks that the app is up and the navigation matches the user's role. External links are checked in the live tier. */
test.describe('smoke', () => {
  test.describe('anonymous', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('home page renders with a login button', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByText('Common Hosted Single Sign-on (CSS)').first()).toBeVisible();
      await expect(page.getByTestId('desktop-login-button')).toBeVisible();
    });

    test('internal links on the home page resolve', async ({ page, request, baseURL }) => {
      await page.goto('/');
      // Wait out the keycloak-js check-sso round trip before reading the DOM.
      await expect(page.getByTestId('desktop-login-button')).toBeVisible();
      const hrefs = await page.locator('a[href]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
      const internal = new Set(hrefs.filter((h) => h.startsWith(baseURL!)).map((h) => h.split('#')[0]));
      expect(internal.size).toBeGreaterThan(0);
      for (const href of internal) {
        expect.soft((await request.get(href)).status(), href).toBe(200);
      }
    });
  });

  test('a regular user sees My Dashboard but not the SSO Dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'My Dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'SSO Dashboard' })).toHaveCount(0);
  });

  test.describe('as admin', () => {
    test.use({ storageState: '.auth/admin.json' });

    test('an SSO admin also sees the SSO Dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('link', { name: 'SSO Dashboard' })).toBeVisible();
    });
  });
});
