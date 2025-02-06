/*  ssoteam-1361
1. If user has existing session with a client then attach the session to that user upon re-authentication
with same client without displaying the login page

2. In standard realm, provided that user has an existing session
with a client and if the same user when authenticates with different client and a different IDP through KC_IDP_HINT,
the previous session should be removed and allowed to login */

import Playground from '../../pageObjects/playgroundPage';
import Utilities from '../../appActions/Utilities';
let util = new Utilities();

describe('KC Single Sign on session', () => {
  before(() => {
    cy.clearAllSessionStorage();
    cy.cleanGC();
    //Establish the session with CSS Sandbox: IDIR
    cy.setid(null).then(() => {
      cy.login();
    });
  });

  after(() => {
    cy.cleanGC();
  });

  it('Go to CSS App', function () {
    // Same application, same client, same IDP
    cy.visit('');
    cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
  });

  it('Go to OIDC Playground', function () {
    // In the playground set the IDP hint to bceidbasic and click login
    // Different application, different client, different IDP
    let playground = new Playground();
    cy.visit(playground.path);
    cy.contains(playground.header);

    playground.fillInPlayground('https://dev.loginproxy.gov.bc.ca/auth', 'standard', 'test-client', 'bceidbasic');

    playground.clickLogin();

    // Log in with BCeID
    cy.setid('bceidbasic').then(() => {
      playground.loginBasicBCeID(Cypress.env('username'), Cypress.env('password'));
    });
    // This tells of a succesfull log in and that the session is attached to the user
    cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
  });

  it('Go back to CSS App', function () {
    cy.visit('');
    // This tells us that NO session is attached to the user
    cy.get('button', { timeout: 10000 }).contains('Login').should('exist');
    cy.get('button', { timeout: 10000 }).contains('Login').click({ force: true });

    // If the screen shows the IDP options, then the session is not attached to the user
    cy.contains('span', 'IDIR', { timeout: 10000 });
  });
});
