// keycloak-js `onLoad: 'check-sso'` sends the whole page to Keycloak with prompt=none and back with the result in the
// URL fragment. The 3rd-party-cookie check is stubbed as unsupported (see e2e.ts), so apps configured for *silent*
// check-sso (e.g. the playground) fall back to this full-page redirect too. It only starts once the page has loaded and
// keycloak-js has initialised, so cy.visit resolves first and later commands race a page that is about to be replaced.
//
// Usage: withCheckSso(() => cy.visit(...)) around the action that loads the page.

const CHECK_SSO_TIMEOUT = 60000;
const CALLBACK_PARAMS = /(^|[#&?])(state|code|error)=/;
const REDIRECTED_MARKER = '__cypressCheckSsoStarted';

type MarkableWindow = Window & { [REDIRECTED_MARKER]?: boolean };

export const withCheckSso = (action: () => void) => {
  // Intercepts last for the whole test and earlier check-sso redirects (e.g. the app's own, during login) can match
  // them without being waited on. A shared alias would let cy.wait resolve on one of those stale requests, so each
  // call gets its own.
  const alias = Cypress._.uniqueId('checkSso');
  cy.intercept({ method: 'GET', url: '**/protocol/openid-connect/auth*', query: { prompt: 'none' } }, () => {
    // The page that started the redirect is still loaded while this request is in flight. Mark it, so we can wait for
    // the page Keycloak redirects back to (a new window, without the marker). `window:before:load` can't be used to
    // tell them apart as it doesn't fire for cross-origin pages such as the playground.
    const win = (cy as unknown as { state: (key: 'window') => MarkableWindow | undefined }).state('window');
    if (win) win[REDIRECTED_MARKER] = true;
  }).as(alias);

  action();

  cy.wait(`@${alias}`, { requestTimeout: CHECK_SSO_TIMEOUT, responseTimeout: CHECK_SSO_TIMEOUT, log: false });
  // The intercept resolves on Keycloak's redirect response, while the old page is still loaded (and looks settled).
  // Wait until the browser has actually loaded the page Keycloak redirected back to.
  cy.window({ timeout: CHECK_SSO_TIMEOUT, log: false }).should((win: MarkableWindow) => {
    expect(win[REDIRECTED_MARKER], 'page reloaded after check-sso').to.be.undefined;
  });
  // Back on the app, keycloak-js strips the callback params from the URL once it has consumed them.
  cy.location('hash', { timeout: CHECK_SSO_TIMEOUT }).should('not.match', CALLBACK_PARAMS);
  cy.document({ timeout: CHECK_SSO_TIMEOUT }).its('readyState').should('eq', 'complete');
};
