// Creation of Integration request variants

import data from '../../fixtures/idpstopper.json';
import Request from '../../appActions/Request';
var kebabCase = require('lodash.kebabcase');
import Utilities from '../../appActions/Utilities';
import Playground from '../../pageObjects/playgroundPage';
let util = new Utilities();
let playground = new Playground();

let testData = data;

describe('Run IDP Stopper Test', () => {
  before(() => {
    cy.cleanGC();
  });

  after(() => {
    cy.cleanGC();
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(data)) {
      let req = new Request();
      it(`Create ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        cy.setid(null).then(() => {
          cy.login();
        });
        req.showCreateContent(data);
        req.populateCreateContent(data);
        req.createRequest();
        cy.logout();
      });

      // Using the OIDC Playground to test the IDP Stopper
      it('Go to Playground', () => {
        cy.visit(playground.path);
        cy.wait(2000);

        playground.fillInPlayground(
          null,
          null,
          kebabCase(data.create.projectname) + '-' + util.getDate() + '-' + Number(req.id),
          null,
        );

        playground.clickLogin();

        // Only go here when there is more than one IDP Specified
        if (data.create.identityprovider.length > 1) {
          // On the IDP Select Page, select/test the IDP
          cy.get('#kc-social-providers').within(() => {
            let n = 0;
            while (n < data.create.identityprovider.length) {
              if (data.create.identityprovider[n] !== '') {
                cy.contains('li', data.create.identityprovider[n]);
              }
              n++;
            }
          });
        } else {
          cy.get('#login-to').should('contain', 'Log in to sfstest7.gov.bc.ca');
        }
      });

      it('Delete the request', () => {
        cy.setid(null).then(() => {
          cy.login();
        });
        req.deleteRequest(req.id);
      });
    }
  });
});
