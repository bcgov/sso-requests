import { expect } from '@playwright/test';
import { Playground } from '../../pages/playground';
import { idpLabels } from '../../support/integration-spec';
import { live, liveAuthFile } from '../../support/live';
import { test } from './fixtures';

/**
 * What a user sees when an app sends them to keycloak, driven by the integration's configuration.
 * Replaces app/cypress/e2e/external/idpstopper-*.
 */
test.describe('keycloak login page', () => {
  test('offers exactly the IdPs the integration requested', async ({ page, integration }) => {
    const app = await integration('chooser', ['azureidir', 'bceidbasic']);
    const playground = new Playground(page);
    await playground.open(app.clientId);
    await playground.login();

    const providers = page.locator('#kc-social-providers li');
    await expect(providers).toHaveCount(2);
    await expect(providers).toContainText([idpLabels.azureidir, idpLabels.bceidbasic]);
  });

  test('a single-IdP integration skips the chooser', async ({ page, integration }) => {
    const app = await integration('single idp', ['bceidbasic']);
    const playground = new Playground(page);
    await playground.open(app.clientId);
    await playground.login();
    await expect(page).toHaveURL(/logontest7\.gov\.bc\.ca/);
  });

  test('the header shows the login page name with its capitalisation', async ({ page, integration }) => {
    const app = await integration('Header Caps', ['azureidir', 'bceidbasic']);
    const playground = new Playground(page);
    await playground.open(app.clientId);
    await playground.login();
    // The draft defaults the dev login page name to the project name.
    await expect(page.locator('#kc-header-wrapper')).toContainText(app.name);
  });

  for (const kind of ['bceidbasic', 'bceidbusiness'] as const) {
    test(`${idpLabels[kind]} tokens have an empty family_name`, async ({ page, integration, loginWith }) => {
      const app = await integration(`${kind} claims`, [kind]);
      const playground = new Playground(page);
      await playground.open(app.clientId);
      await playground.login();
      await loginWith(page, kind);
      await playground.expectLoggedIn();
      expect(await playground.parsedTokenClaim('family_name')).toBe('');
    });
  }
});

test.describe('CSS app session', () => {
  test.use({ storageState: liveAuthFile('user') });

  test('logging into another app with BCeID ends the CSS app IDIR session', async ({
    page,
    integration,
    loginWith,
  }) => {
    const other = await integration('bceid other app', ['bceidbasic']);

    await page.goto(live.appUrl);
    await expect(page.getByTestId('desktop-logout-button')).toBeVisible();

    const playground = new Playground(page);
    await playground.open(other.clientId);
    await playground.login();
    await loginWith(page, 'bceidbasic');
    await playground.expectLoggedIn();

    await page.goto(live.appUrl);
    await expect(page.getByTestId('desktop-login-button')).toBeVisible();
  });
});
