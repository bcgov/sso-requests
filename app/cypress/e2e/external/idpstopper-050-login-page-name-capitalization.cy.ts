import data from '../fixtures/capitalization-fixtures.json'; // The data file will drive the tests
import Request from '../appActions/Request';
import Utilities from '../appActions/Utilities';
import Playground from '../pageObjects/playgroundPage';

let util = new Utilities();
let req = new Request();
let playground = new Playground();
var kebabCase = require('lodash.kebabcase');

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
      cy.setid(null).then(() => {
        cy.login(null, null, null, null);
      });
      req.showCreateContent(data[0]);
      req.populateCreateContent(data[0]);
      req.createRequest();
      cy.logout(null);
    });

    // Using the OIDC Playground to test the IDP Stopper
    it('Go to Playground', () => {
      console.log('Went to playground');

      cy.visit(playground.path);
      cy.wait(2000);

      playground.fillInPlayground(
        null,
        null,
        kebabCase(request.projectname) + '-' + util.getDate() + '-' + Number(req.id),
        null,
      );
      playground.clickLogin();
      cy.wait(2000); // Wait a bit because to make sure the page is loaded

      // On the IDP Select Page, confirm the title is correctly capitalized.
      cy.get('#kc-header-wrapper').contains(request.ssoheaderdev);
    });

    it('Delete the request', () => {
      cy.setid(null).then(() => {
        cy.login(null, null, null, null);
      });
      req.deleteRequest(req.id);
      cy.logout(null);
    });
  }
});
