import { expect, test } from '@playwright/test';
import { live } from '../../support/live';

/**
 * External links in the CSS app's header/footer still resolve. Lives in the scheduled tier because it depends on
 * third-party sites; a gov.bc.ca outage shouldn't fail a PR. Replaces app/cypress/e2e/ci/smoke-10-brokenlinks.
 */
test('external links on the home page resolve', async ({ page, request }) => {
  await page.goto(live.appUrl);
  await expect(page.getByTestId('desktop-login-button')).toBeVisible();
  const hrefs = await page.locator('a[href^="http"]').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  for (const href of new Set(hrefs)) {
    const res = await request.get(href, { failOnStatusCode: false, maxRedirects: 10 });
    expect.soft(res.status(), href).toBeLessThan(400);
  }
});
