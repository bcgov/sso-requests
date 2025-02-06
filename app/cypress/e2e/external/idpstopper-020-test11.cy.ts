// Creation of Integration request variants

import data from '../../fixtures/idpstopper11.json'; // The data file will drive the tests
import Request from '../../appActions/Request';
import Playground from '../../pageObjects/playgroundPage';
import { authenticator } from 'otplib';
import Utilities from '../../appActions/Utilities';
let util = new Utilities();

var kebabCase = require('lodash.kebabcase');

let testData = data;

describe('Run IDP Stopper Test', () => {
  before(() => {
    cy.cleanGC();
  });

  after(() => {
    cy.cleanGC();
  });

  testData.forEach((data, index) => {
    let req = new Request();
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(data)) {
      it(`Create ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        cy.setid('admin').then(() => {
          cy.login();
        });
        req.showCreateContent(data);
        req.populateCreateContent(data);
        req.createRequest();
        cy.logout();
      });

      // Using the OIDC Playground to test the IDP Stopper
      it('Go to Playground', () => {
        Cypress.session.clearAllSavedSessions();
        let playground = new Playground();

        cy.visit(playground.path);

        playground.fillInPlayground(
          null,
          null,
          kebabCase(data.create.projectname) + '-' + req.uid + '-' + Number(req.id),
          null,
        );

        playground.clickLogin();

        cy.log(data.create.identityprovider[0]);
        if (data.create.identityprovider[0] == 'Basic BCeID') {
          cy.setid('bceidbasic').then(() => {
            cy.log(Cypress.env('username'));
            playground.loginBasicBCeID(Cypress.env('username'), Cypress.env('password'));
          });
        } else if (data.create.identityprovider[0] == 'Business BCeID') {
          cy.setid('bceidbusiness').then(() => {
            cy.log(Cypress.env('username'));
            playground.loginBusinesBCeID(Cypress.env('username'), Cypress.env('password'));
          });
        } else if (data.create.identityprovider[0] == 'GitHub BC Gov') {
          cy.setid('githubbcgov').then(() => {
            cy.log(Cypress.env('username'));
            const token = authenticator.generate(Cypress.env('otpsecret'));
            playground.loginGithubbcGov(Cypress.env('username'), Cypress.env('password'), token);
          });
        } else if (data.create.identityprovider[0] == 'GitHub') {
          cy.setid('githubpublic').then(() => {
            cy.log(Cypress.env('username'));
            const token = authenticator.generate(Cypress.env('otpsecret'));
            playground.loginGithubbcGov(Cypress.env('username'), Cypress.env('password'), token);
          });
        }
        cy.contains('a', 'Token Parsed', { timeout: 1000 }).click();
        cy.contains('td', 'family_name').siblings().should('be.empty');
        //contains('').should('be.visible');
        playground.clickLogout();
      });

      it('Delete the request', () => {
        cy.setid('admin').then(() => {
          cy.login();
        });
        req.deleteRequest(req.id);
        cy.logout();
      });
    }
  });
});
