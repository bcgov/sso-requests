import data from '../../fixtures/capitalization-fixtures.json'; // The data file will drive the tests
import Request from '../../appActions/Request';
import Utilities from '../../appActions/Utilities';
import Playground from '../../pageObjects/playgroundPage';
import { kebabCase } from 'lodash';

let util = new Utilities();
let req = new Request();
let playground = new Playground();

describe('Create Integration Requests For login page capitalization', () => {
  before(() => {
    cy.cleanGC();
  });
  after(() => {
    cy.cleanGC();
  });

  const request = data[0].create;

  // Only run the test if the smoketest flag is set and the test is a smoketest
  if (util.runOk(data[0])) {
    // Create an integration with 2 or more IDPs and an ssoheaderdev with capitalization
    it(`Create ${request.projectname} (Test ID: ${request.test_id}) - ${request.description}`, () => {
      let integration: Cypress.Chainable | undefined;

      cy.login();
      req.showCreateContent(data[0]);
      req.populateCreateContent(data[0]);
      integration = req.createRequest();

      integration.then(() => {
        cy.visit(playground.path);
        cy.contains(playground.header);

        playground.fillInPlayground(
          null,
          null,
          kebabCase(request.projectname) + '-' + req.uid + '-' + Number(req.id),
          null,
        );
        playground.clickLogin();

        // On the IDP Select Page, confirm the title is correctly capitalized.
        cy.get('#kc-header-wrapper').contains(request.ssoheaderdev);
      });
    });

    it('Delete the request', () => {
      cy.login();
      req.deleteRequest(req.id);
    });
  }
});
