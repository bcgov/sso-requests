// Creation of Integration request variants

import data from '../../fixtures/sso-requests.json'; // The data file will drive the tests
import Request from '../../appActions/Request';
import Utilities from '../../appActions/Utilities';
let testData = data;
let tempData = data;
let util = new Utilities();

describe('Create SSO Integration Requests', () => {
  before(() => {
    cy.cleanGC();
  });
  after(() => {
    cy.cleanGC();
  });
  beforeEach(() => {
    cy.setid(null).then(() => {
      cy.login();
    });
  });

  afterEach(() => {
    cy.logout();
  });

  after(() => {
    cy.writeFile('cypress/fixtures/ssorequestsafter.json', tempData);
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    if (util.runOk(data)) {
      it(`Create ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        let req = new Request();
        req.showCreateContent(data);
        req.populateCreateContent(data);
        cy.wrap(req.createRequest()).then(() => {
          tempData[index].id = Cypress.env(util.md5(data.create.projectname));
        });
      });
    }
  });
});
