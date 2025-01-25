import 'cypress-plugin-api';
import 'cypress-real-events';
import HomePage from '../pageObjects/homePage';

Cypress.Commands.add('login', (username, password, host, siteminder) => {
  const home = new HomePage();

  // Go to the host
  cy.visit(host || Cypress.env('host'));

  const sentArgs = { user: username, pass: password };

  cy.contains('Common Hosted Single Sign-on (CSS)');
  // Click the login button
  home.clickLoginButton();

  // Validate siteminder and login
  cy.origin(siteminder || Cypress.env('siteminder'), { args: sentArgs }, ({ user, pass }) => {
    cy.get('#login-to', { timeout: 10000 }).contains('Log in to ').should('be.visible');
    cy.get('#user', { timeout: 10000 }).type(user || Cypress.env('username'));
    cy.get('#password', { timeout: 10000 }).type(pass || Cypress.env('password'), { log: false });
    cy.get('input[name=btnSubmit]', { timeout: 10000 }).click();
  });

  cy.contains('Common Hosted Single Sign-on (CSS)');
  cy.get('button', { timeout: 10000 }).contains('Log out').should('be.visible');

  cy.log('Logged in as ' + (username || Cypress.env('username')));
});

Cypress.Commands.add('logout', (host) => {
  // Make sure you are on page with log out and logout
  cy.visit(host || Cypress.env('host'));
  cy.contains('Common Hosted Single Sign-on (CSS)', { timeout: 10000 });
  cy.get('button', { timeout: 10000 }).contains('Log out').should('be.visible');
  cy.get('button')
    .contains('Log out')
    .click({ force: true })
    .then(() => {
      cy.wait(2000);
    });
  // Return to home page
  cy.visit(host || Cypress.env('host'));
  if (Cypress.env('localtest')) {
    cy.wait(5000);
  }
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
