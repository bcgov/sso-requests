import { expect, Page } from '@playwright/test';
import { live } from '../support/live';

/**
 * The bcgov Keycloak OIDC playground (https://bcgov.github.io/keycloak-example-apps/), used as "some other app" that
 * logs in with a given client. Two playground loads in the same browser context = two apps sharing one SSO session.
 */
export class Playground {
  constructor(readonly page: Page) {}

  async open(clientId: string, opts: { idpHint?: string; url?: string; realm?: string } = {}) {
    await this.page.goto(live.playgroundUrl);
    await expect(this.page.getByText('Keycloak OIDC Playground')).toBeVisible();
    await this.page.locator('input[name="url"]').fill(opts.url ?? live.ssoUrl);
    await this.page.locator('input[name="realm"]').fill(opts.realm ?? 'standard');
    await this.page.locator('input[name="clientId"]').fill(clientId);
    await this.update();
    if (opts.idpHint) {
      await this.page.getByText('Keycloak Login Options').click();
      await this.page.locator('input[name="idpHint"]').fill(opts.idpHint);
      await this.update();
    }
  }

  async login() {
    await this.page.getByRole('button', { name: 'Login' }).click();
  }

  async logout() {
    await this.page.getByRole('button', { name: 'Logout' }).click();
  }

  async expectLoggedIn() {
    await expect(this.page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 30_000 });
  }

  /** The keycloak error page shown by the idp-stopper when the existing session's IdP isn't allowed. */
  async expectRefused(message = /already logged into IDIR or BCeID/) {
    await expect(this.page.locator('#kc-error-message')).toContainText(message, { timeout: 30_000 });
  }

  /** Claims of the parsed ID token, as shown in the playground's "Token Parsed" view. */
  async parsedTokenClaim(claim: string) {
    await this.page.getByRole('button', { name: 'Token Parsed' }).click();
    const row = this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: claim, exact: true }) });
    return (await row.getByRole('cell').nth(1).innerText()).trim();
  }

  /** The playground re-initialises keycloak-js on Update without a network signal we can wait on. */
  private async update() {
    await this.page.getByRole('button', { name: 'Update' }).filter({ visible: true }).click();
    await this.page.waitForLoadState('networkidle');
  }
}
