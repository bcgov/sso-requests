// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';
import { startAuthDiagnostics } from './authDiagnostics';

// keycloak-js loads Keycloak's 3p-cookies/step1.html in an iframe on every page load. That response sets a cookie, and
// Cypress's proxy holds cross-origin Set-Cookie responses until the runner acknowledges them, with no timeout. If the
// page is torn down mid-flight (cy.session, cy.visit) the acknowledgement is lost and the iframe never loads, so
// keycloak.init() rejects after 10s and the app renders logged out. Answer the check locally as a browser that blocks
// 3rd-party cookies would; keycloak-js then skips its session-status iframe and relies on the check-sso redirect.
const stubThirdPartyCookieCheck = () => {
  cy.intercept('GET', '**/protocol/openid-connect/3p-cookies/step1.html*', {
    statusCode: 200,
    headers: { 'content-type': 'text/html' },
    body: '<!DOCTYPE html><script>window.parent.postMessage("unsupported", "*");</script>',
  });
};

beforeEach(() => {
  // Registered before the diagnostics intercept so the diagnostics handler still sees (and logs) the request.
  stubThirdPartyCookieCheck();
  startAuthDiagnostics();
});

// Alternatively you can use CommonJS syntax:
// require('./commands')
