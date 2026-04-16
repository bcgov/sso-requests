import searchIntegration from '../../fixtures/search-test-integration.json';
import rolesData from '../../fixtures/rolesusers.json';
import Request from '../../appActions/Request';
import Playground from '../../pageObjects/playgroundPage';
import Utilities from '../../appActions/Utilities';
import { kebabCase } from 'lodash';

let util = new Utilities();
let playground = new Playground();

describe('Create Integration Requests', () => {
  const req = new Request();

  after(() => {
    cy.login();
    req.deleteRequest(req.id);
    req.deleteTeam();
  });

  if (util.runOk(searchIntegration)) {
    let integration: Cypress.Chainable | undefined;

    it(`Can create the integration for seach tests`, () => {
      cy.login();
      req.showCreateContent(searchIntegration);
      req.populateCreateContent(searchIntegration);
      integration = req.createRequest();
      // Login with bceids to link user to client
      integration.then(() => {
        ['bceidbasic', 'bceidbusiness'].forEach((idp) => {
          cy.visit(playground.path);
          const clientName = kebabCase(`${req.projectName}@$${req.uid} ${Number(req.id)}`);
          playground.fillInPlayground(null, null, clientName, idp);

          playground.clickLogin();

          cy.setid(idp).then(() => {
            if (idp === 'bceidbasic') playground.loginBasicBCeID(Cypress.env('username'), Cypress.env('password'));
            if (idp === 'bceidbusiness') playground.loginBusinesBCeID(Cypress.env('username'), Cypress.env('password'));
          });

          cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
          playground.clickLogout();
        });
      });
    });
  }

  rolesData.forEach((value) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(value)) {
      it(`Search for user: "${value.id + '@' + util.getDate()}": ${value.environment} - ${value.idp} - ${
        value.criterion
      }`, () => {
        cy.login();

        let searchValue = value.search_value;
        if (value.criterion === 'IDP GUID') {
          // Get the IDP GUID from the environment, we need to store these as secrets in github
          // In our datafile, we store the email address instead of the GUID and we use it for lookup
          const guidObject = Cypress.env('guid');
          searchValue = guidObject[value.search_value];
        }

        req.searchUser(req.id, value.environment, value.idp, value.criterion, value.error, searchValue);
      });
    }
  });
});
