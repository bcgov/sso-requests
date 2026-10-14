// keycloak-js `onLoad: 'check-sso'` sends the whole page to Keycloak with prompt=none and back with the result in the
// URL fragment. The 3rd-party-cookie check is stubbed as unsupported (see e2e.ts), so apps configured for *silent*
// check-sso (e.g. the playground) fall back to this full-page redirect too. It only starts once the page has loaded and
// keycloak-js has initialised, so cy.visit resolves first and later commands race a page that is about to be replaced.
//
// Usage: call expectCheckSso() before the action that loads the page, then waitForCheckSso() after it.

const CHECK_SSO_TIMEOUT = 60000;
const CALLBACK_PARAMS = /(^|[#&?])(state|code|error)=/;

export const expectCheckSso = () => {
  cy.intercept({ method: 'GET', url: '**/protocol/openid-connect/auth*', query: { prompt: 'none' } }).as('checkSso');
};

export const waitForCheckSso = () => {
  cy.wait('@checkSso', { requestTimeout: CHECK_SSO_TIMEOUT, responseTimeout: CHECK_SSO_TIMEOUT, log: false });
  // Back on the app, keycloak-js strips the callback params from the URL once it has consumed them.
  cy.location('hash', { timeout: CHECK_SSO_TIMEOUT }).should('not.match', CALLBACK_PARAMS);
  cy.document({ timeout: CHECK_SSO_TIMEOUT }).its('readyState').should('eq', 'complete');
};
