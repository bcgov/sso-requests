import 'cypress-plugin-api';
import 'cypress-real-events';
import HomePage from '../pageObjects/homePage';
import LoginProxy from '../pageObjects/loginProxy';
import Utilities from '../appActions/Utilities';
const utils = new Utilities();

Cypress.Commands.add('login', (username: string = utils.cssUser, idp: 'idir' | 'azureidir' = 'idir') => {
  const home = new HomePage();
  const loginPage = new LoginProxy();

  const data = Cypress.env('users');
  let foundItem = data.find((item: User) => item.username === username && item.type === idp);

  if (idp === 'idir') {
    cy.session(
      `${username}-${idp}`,
      () => {
        cy.visit(Cypress.env('host'));
        cy.contains(home.title);
        home.clickLoginButton();
        cy.get('#user').type(foundItem.username);
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
          cy.get('input[type="email"]').type(foundItem.email, { delay: 15 });
          cy.contains('Next').click();
          cy.get('input[type="password"]').type(foundItem.password, { delay: 15 });
          cy.contains('Sign in').click();

          cy.get('input[type="tel"]').type(userToken, { delay: 15 });
          cy.contains('Verify').click();

          cy.get('input[type="submit"][value="Yes"]', { timeout: 2000 }).then(($btn) => {
            if ($btn.length) {
              cy.wrap($btn).click();
            } else {
              cy.log('No "Yes" submit button found, skipping');
            }
          });
        });
        cy.contains(home.title);
      },
      { cacheAcrossSpecs: true },
    );
  }
  cy.visit(Cypress.env('host'));
});

Cypress.Commands.add('logout', (host) => {
  // Make sure you are on page with log out and logout
  cy.visit(host || Cypress.env('host'));
  cy.contains('Common Hosted Single Sign-on (CSS)', { timeout: 10000 });
  cy.get('button', { timeout: 20000 }).contains('Log out').should('be.visible');
  cy.get('button').contains('Log out').click({ force: true });
  // Return to home page
  cy.visit(host || Cypress.env('host'));
  cy.contains('Common Hosted Single Sign-on (CSS)');
  cy.get('button', { timeout: 10000 }).contains('Log in').should('be.visible');

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

Cypress.Commands.add('cleanGC', () => {
  // Clean up memory by triggering Garbage Collection
  cy.window().then((win) => {
    // window.gc is enabled with --js-flags=--expose-gc chrome flag
    if (typeof win.gc === 'function') {
      // run gc multiple times in an attempt to force a major GC between tests
      win.gc();
      win.gc();
      win.gc();
      win.gc();
      win.gc();
    }
  });
});
