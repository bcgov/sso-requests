import 'cypress-plugin-api';
import 'cypress-real-events';
import HomePage from '../pageObjects/homePage';
import Utilities from '../appActions/Utilities';
const utils = new Utilities();

Cypress.Commands.add('login', (username: string = utils.cssUser, idp: 'idir' | 'azureidir' = 'azureidir') => {
  const home = new HomePage();

  const data = Cypress.env('users');
  let foundItem = data.find((item: User) => item.username === username && item.type === idp);

  if (idp === 'idir') {
    cy.session(
      `${username}-${idp}`,
      () => {
        cy.visit(Cypress.env('host'));
        cy.contains(home.title);
        home.clickLoginButton();
        cy.get('#user').type(foundItem.username, { log: false });
        cy.get('#password').type(foundItem.password, { log: false });
        cy.get('input[name=btnSubmit]').click();
        cy.contains(home.title);
      },
      { cacheAcrossSpecs: true },
    );
  } else {
    cy.session(
      `${username}-${idp}`,
      async () => {
        cy.visit(Cypress.env('host'));
        cy.contains(home.title);
        home.clickLoginButton();

        const userToken = await utils.getOTPToken(foundItem.otpsecret);

        cy.origin('login.microsoftonline.com', { args: { foundItem, userToken } }, ({ foundItem, userToken }) => {
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
          fillInput('input[type="tel"]', userToken);
          cy.contains('Verify').should('be.visible').click();

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
        cacheAcrossSpecs: true,
        validate: () => {
          cy.visit(Cypress.env('host'));
          cy.get('body').then(($body) => {
            if ($body.find('[data-testid="desktop-login-button"]').length > 0) {
              cy.get('[data-testid="desktop-login-button"]').click();
            }
          });
          cy.get('[data-testid="desktop-logout-button"]', { timeout: 10000 }).should('be.visible');
        },
      },
    );
  }
  cy.visit(Cypress.env('host'));
});

Cypress.Commands.add('logout', (host) => {
  // Make sure you are on page with log out and logout
  cy.visit(host || Cypress.env('host'));
  cy.contains('Common Hosted Single Sign-on (CSS)', { timeout: 10000 });
  cy.get('[data-testid="desktop-logout-button"]', { timeout: 20000 }).should('be.visible');
  cy.get('[data-testid="desktop-logout-button"]').click({ force: true });
  // Return to home page
  cy.visit(host || Cypress.env('host'));
  cy.contains('Common Hosted Single Sign-on (CSS)');
  cy.get('[data-testid="desktop-login-button"]', { timeout: 10000 }).should('be.visible');

  cy.log('Logged out');
});

interface User {
  type: string;
  username: string;
  password: string;
  email: string;
}

Cypress.Commands.add('setid', (type?) => {
  // Set the ID/PW Env vars to default if type not passed in
  if (!type) {
    type = 'default';
  }
  const data = Cypress.env('users');

  let foundItem = data.find((item: User) => item.type === type);
  Cypress.env('username', foundItem.username);
  Cypress.env('password', foundItem.password);
  Cypress.env('type', foundItem.type);
  if (foundItem.otpsecret) {
    Cypress.env('otpsecret', foundItem.otpsecret);
  }
});
