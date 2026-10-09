import 'cypress-plugin-api';
import 'cypress-real-events';
import HomePage from '../pageObjects/homePage';
import Utilities from '../appActions/Utilities';
import { dumpAuthDiagnostics } from './authDiagnostics';
const utils = new Utilities();

const SESSION_VALIDATE_TIMEOUT = 60000;
const loginButton = '[data-testid="desktop-login-button"]';
const logoutButton = '[data-testid="desktop-logout-button"]';

// Fails (so cy.session recreates and re-caches the session) if the restored cookies no longer hold a Keycloak session.
// Must not log in here: anything done in validate is not saved to the session cache.
const validateSession = () => {
  cy.visit(Cypress.expose('host') || '/');
  // check-sso redirects to Keycloak and back with #state/code; wait until keycloak-js has consumed the callback.
  cy.location('hash', { timeout: SESSION_VALIDATE_TIMEOUT }).should('not.match', /(state|code)=/);
  // Neither button renders until keycloak.init resolves, and exactly one renders afterwards.
  cy.get(`${loginButton}, ${logoutButton}`, { timeout: SESSION_VALIDATE_TIMEOUT })
    .should('be.visible')
    .then(($button) => {
      if ($button.is(loginButton)) {
        dumpAuthDiagnostics('Restored session is not authenticated').then(() => {
          throw new Error('Restored session is not authenticated');
        });
      }
    });
};

Cypress.Commands.add('login', (username: string = utils.cssUser, idp: 'idir' | 'azureidir' = 'azureidir') => {
  const home = new HomePage();

  return cy.env(['users']).then((values) => {
    const users: CypressTestUser[] = values.users;
    if (!Array.isArray(users)) throw new Error('Cypress users must be an array');
    const foundItem = users.find((item) => item.username === username && item.type === idp);
    if (!foundItem) throw new Error(`No Cypress user found for ${username} (${idp})`);

    if (idp === 'idir') {
      cy.session(
        `${username}-${idp}`,
        () => {
          cy.visit(Cypress.expose('host') || '/');
          cy.contains(home.title);
          home.clickLoginButton();
          cy.get('#user').type(foundItem.username, { log: false });
          cy.get('#password').type(foundItem.password, { log: false });
          cy.get('input[name=btnSubmit]').click();
          cy.contains(home.title);
        },
        { cacheAcrossSpecs: true, validate: validateSession },
      );
    } else {
      cy.session(
        `${username}-${idp}`,
        () => {
          if (!foundItem.otpsecret) throw new Error(`No OTP secret found for ${username}`);

          cy.visit(Cypress.expose('host') || '/');
          cy.contains(home.title);
          home.clickLoginButton();

          cy.origin('login.microsoftonline.com', { args: { foundItem } }, ({ foundItem }) => {
            // MS pre-renders off-screen "decoy" inputs for browser autofill (class moveOffScreen, aria-hidden),
            // so target only the real, visible fields. MS's knockout bindings can also reset an input while
            // it is initializing, dropping already-typed characters, so verify the value and retype if needed.
            const fillInput = (selector: string, value: string, attempts = 3) => {
              cy.get(`${selector}:not(.moveOffScreen):not([aria-hidden="true"])`, { timeout: 30000 })
                .should('be.visible')
                .clear({ log: false })
                .type(value, { delay: 15, log: false });
              cy.get(`${selector}:not(.moveOffScreen):not([aria-hidden="true"])`).then(($input) => {
                if ($input.val() !== value) {
                  if (attempts <= 1) throw new Error(`Failed to fill ${selector} after retries`);
                  fillInput(selector, value, attempts - 1);
                }
              });
            };

            fillInput('input[type="email"]', foundItem.email);
            cy.contains('Next').should('be.visible').click();
            fillInput('input[type="password"]', foundItem.password);
            cy.contains('Sign in').should('be.visible').click();

            // MS sometimes (e.g. from CI runner IPs) shows a "Verify your identity" method picker before the
            // code input. Wait until either page has loaded, then pick "Use a verification code" if needed.
            const codeInput = 'input[type="tel"]:not(.moveOffScreen):not([aria-hidden="true"]):visible';
            const useCodeOption = ':contains("Use a verification code"):visible';
            cy.get('body', { timeout: 30000 }).should(($body) => {
              const found = $body.find(`${codeInput}, ${useCodeOption}`).length > 0;
              expect(found, 'MFA code input or verification method picker').to.be.true;
            });
            cy.get('body').then(($body) => {
              if (!$body.find(codeInput).length) {
                cy.contains(/use a verification code/i)
                  .should('be.visible')
                  .click();
              }
            });

            cy.task<string>('generateOTP', foundItem.otpsecret, { log: false }).then((userToken) => {
              fillInput('input[type="tel"]', userToken);
              cy.contains('Verify').should('be.visible').click();
            });

            // After MFA, MS posts to /SAS/ProcessAuth, which either renders the optional "Stay signed in?"
            // (KMSI) page or redirects back to the app. Wait for that page to fully load before deciding,
            // otherwise we can inspect the blank in-between page and wrongly skip the prompt.
            const yesButton = '#idSIButton9, input[type="submit"][value="Yes"]';
            cy.location('pathname', { timeout: 30000 }).should('include', '/SAS/ProcessAuth');
            cy.document().its('readyState').should('eq', 'complete');
            cy.window().then((win: any) => {
              const isKmsiPage =
                win.$Config?.pgid === 'KmsiInterrupt' || /stay signed in/i.test(win.document.body?.innerText || '');
              if (isKmsiPage) {
                cy.get(yesButton, { timeout: 30000 }).should('be.visible').click();
              } else {
                cy.log('No "Stay signed in" prompt, skipping');
              }
            });
          });
          cy.contains(home.title);
        },
        {
          cacheAcrossSpecs: username !== utils.cssAdmin,
          validate: validateSession,
        },
      );
    }
    cy.visit(Cypress.expose('host') || '/');
  });
});

Cypress.Commands.add('logout', (host) => {
  // Make sure you are on page with log out and logout
  cy.visit(host || Cypress.expose('host') || '/');
  cy.contains('Common Hosted Single Sign-on (CSS)', { timeout: 10000 });
  cy.get('[data-testid="desktop-logout-button"]', { timeout: 20000 }).should('be.visible');
  cy.get('[data-testid="desktop-logout-button"]').click({ force: true });
  // Return to home page
  cy.visit(host || Cypress.expose('host') || '/');
  cy.contains('Common Hosted Single Sign-on (CSS)');
  cy.get('[data-testid="desktop-login-button"]', { timeout: 10000 }).should('be.visible');

  cy.log('Logged out');
});

Cypress.Commands.add('setid', (type?) => {
  return cy.env(['users']).then((values) => {
    const users: CypressTestUser[] = values.users;
    if (!Array.isArray(users)) throw new Error('Cypress users must be an array');
    const foundItem = users.find((item) => item.type === (type || 'default'));
    if (!foundItem) throw new Error(`No Cypress user found for type ${type || 'default'}`);
    return foundItem;
  });
});
