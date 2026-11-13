import { Page } from '@playwright/test';
import { Playground } from '../../pages/playground';
import { Idp } from '../../support/integration-spec';
import { test } from './fixtures';

/**
 * SSO session behaviour across two apps in the same browser: log into app A, then open app B.
 * B either reuses the session silently, or the idp-stopper refuses it because the session's IdP isn't one B allows.
 *
 * Replaces app/cypress/e2e/external/sso-020-sessions (STS-*) with the cases named by behaviour.
 */

type App = { idps: Idp[]; loginWith: Idp };
type Case = { title: string; first: App; second: App; outcome: 'reused' | 'refused' };

const idirOnly = (): App => ({ idps: ['azureidir'], loginWith: 'azureidir' });
const multi = (loginWith: Idp): App => ({ idps: ['azureidir', 'bceidbasic', 'githubbcgov'], loginWith });
const bceidOnly = (): App => ({ idps: ['bceidbasic'], loginWith: 'bceidbasic' });

const cases: Case[] = [
  {
    title: 'an IDIR session is reused by another IDIR-only app',
    first: idirOnly(),
    second: idirOnly(),
    outcome: 'reused',
  },
  {
    title: 'an IDIR session is reused by a multi-IdP app once IDIR is chosen',
    first: idirOnly(),
    second: multi('azureidir'),
    outcome: 'reused',
  },
  {
    title: 'an IDIR session from a multi-IdP app is reused by an IDIR-only app',
    first: multi('azureidir'),
    second: idirOnly(),
    outcome: 'reused',
  },
  {
    title: 'an IDIR session is reused between two multi-IdP apps',
    first: multi('azureidir'),
    second: multi('azureidir'),
    outcome: 'reused',
  },
  {
    title: 'an IDIR session is refused by a BCeID-only app',
    first: idirOnly(),
    second: bceidOnly(),
    outcome: 'refused',
  },
  {
    title: 'a BCeID session is refused by an IDIR-only app',
    first: multi('bceidbasic'),
    second: idirOnly(),
    outcome: 'refused',
  },
];

test.describe('SSO sessions across apps', () => {
  for (const { title, first, second, outcome } of cases) {
    test(title, async ({ page, integration, loginWith }) => {
      const [a, b] = await Promise.all([integration('session A', first.idps), integration('session B', second.idps)]);
      const playground = new Playground(page);

      await test.step(`log into app A with ${first.loginWith}`, async () => {
        await playground.open(a.clientId);
        await playground.login();
        await chooseIdpIfAsked(page, first);
        await loginWith(page, first.loginWith);
        await playground.expectLoggedIn();
      });

      await test.step(`open app B (${second.idps.join(', ')})`, async () => {
        await playground.open(b.clientId);
        await playground.login();
        await chooseIdpIfAsked(page, second);
        if (outcome === 'reused') {
          // No credentials entered: the existing session must be enough.
          await playground.expectLoggedIn();
        } else {
          // B's only IdP isn't the session's, so the user signs in there and the idp-stopper rejects the mix.
          if (second.idps.length === 1) await loginWith(page, second.loginWith);
          await playground.expectRefused();
        }
      });
    });
  }
});

/** Multi-IdP clients show keycloak's chooser; single-IdP ones redirect straight through. */
async function chooseIdpIfAsked(page: Page, app: App) {
  if (app.idps.length > 1) await page.locator(`#social-${app.loginWith}`).click();
}
