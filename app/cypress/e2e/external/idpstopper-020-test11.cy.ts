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
        let integration: Cypress.Chainable | undefined;
        cy.setid('admin').then(() => {
          cy.login();
        });
        req.showCreateContent(data);
        req.populateCreateContent(data);
        integration = req.createRequest();
        cy.logout();

        integration.then(() => {
          let playground = new Playground();

          cy.visit(playground.path);

          playground.fillInPlayground(
            null,
            null,
            kebabCase(data.create.projectname) + '-' + req.uid + '-' + Number(req.id),
            null,
          );

          playground.clickLogin();

          if (data.create.identityprovider[0] == 'Basic BCeID') {
            cy.setid('bceidbasic').then(() => {
              playground.loginBasicBCeID(Cypress.env('username'), Cypress.env('password'));
            });
          } else if (data.create.identityprovider[0] == 'Business BCeID') {
            cy.setid('bceidbusiness').then(() => {
              playground.loginBusinesBCeID(Cypress.env('username'), Cypress.env('password'));
            });
          } else if (data.create.identityprovider[0] == 'GitHub BC Gov') {
            cy.setid('githubbcgov').then(() => {
              const token = authenticator.generate(Cypress.env('otpsecret'));
              playground.loginGithubbcGov(Cypress.env('username'), Cypress.env('password'), token);
            });
          } else if (data.create.identityprovider[0] == 'GitHub') {
            cy.setid('githubpublic').then(() => {
              const token = authenticator.generate(Cypress.env('otpsecret'));
              playground.loginGithubbcGov(Cypress.env('username'), Cypress.env('password'), token);
            });
          }
          cy.contains('a', 'Token Parsed', { timeout: 1000 }).click();
          cy.contains('td', 'family_name').siblings().should('be.empty');
          playground.clickLogout();
        });
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
