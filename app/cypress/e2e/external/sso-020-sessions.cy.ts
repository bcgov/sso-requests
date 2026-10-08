import data from '../../fixtures/sso-test.json'; // The data file will drive the tests
import Playground from '../../pageObjects/playgroundPage';
import Request from '../../appActions/Request';
import Utilities from '../../appActions/Utilities';
import { kebabCase } from 'lodash';

let util = new Utilities();
let req = new Request();
let playground = new Playground();

let testData = data;

describe('SSO Tests', () => {
  testData.forEach((data, index) => {
    let integration1Id: string;
    let integration2Id: string;
    it('Find Integration IDs', function () {
      cy.login();

      req.getID(data.integration_1).then(() => {
        integration1Id = req.id;
        cy.log('Integration 1 ID: ' + integration1Id);
      });
      req.getID(data.integration_2).then(() => {
        integration2Id = req.id;
        cy.log('Integration 2 ID: ' + integration2Id);
      });
    });

    it(`Test: "${data.id}": ${data.idp_hint_1}/ ${data.idp_hint_2}`, function () {
      //Isolate this session to be exclusively for the test otherwise context will be shared with other tests
      cy.session(data.id, () => {
        cy.on('uncaught:exception', (e) => {
          return false;
        });

        cy.visit(playground.path);

        playground.fillInPlayground(
          null,
          null,
          kebabCase(data.integration_1) + '-' + util.getDate() + '-' + Number(integration1Id),
          null,
        );

        playground.clickLogin();

        if (!data.single_idp_1) {
          cy.get('#social-' + data.idp_hint_1, { timeout: 10000 }).click({ force: true });
        }

        // Log in
        if (data.idp_hint_1 == 'idir') {
          cy.setid(null).then(({ username, password }) => {
            playground.loginIDIR(username, password);
          });
        } else if (data.idp_hint_1 == 'bceidbasic') {
          cy.setid(data.idp_hint_1).then(({ username, password }) => {
            playground.loginBasicBCeID(username, password);
          });
        }
        if (data.result_1) {
          // This tells of a succesfull log in and that the session is attached to the user
          cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
        }

        cy.visit(playground.path);

        playground.fillInPlayground(
          null,
          null,
          kebabCase(data.integration_2) + '-' + util.getDate() + '-' + Number(integration2Id),
          null,
        );

        playground.clickLogin();

        if (data.result_2 && data.single_idp_2) {
          // This tells of a succesfull log in and that the session is attached to the user
          cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
        } else {
          if (!data.single_idp_2) {
            cy.get('#social-' + data.idp_hint_2, { timeout: 10000 }).click({ force: true });
            if (data.result_2) {
              // This tells of a succesfull log in and that the session is attached to the user
              cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
            } else {
              cy.get('#kc-error-message > p').contains(data.error_2);
            }
          } else if (data.idp_hint_2 == 'bceidbasic') {
            cy.setid('bceidbasic').then(({ username, password }) => {
              playground.loginBasicBCeID(username, password);
            });
          } else if (data.idp_hint_2 == 'idir') {
            cy.setid(null).then(({ username, password }) => {
              playground.loginIDIR(username, password);
            });
          }
          if (!data.result_2) {
            cy.get('#kc-error-message > p').contains(data.error_2);
          }
        }
        // This tells of a succesfull log in and that the session is attached to the user
        if (data.result_2) {
          // This tells of a succesfull log in and that the session is attached to the user
          cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
          playground.clickLogout();
        }
      });
    });
  });
});
