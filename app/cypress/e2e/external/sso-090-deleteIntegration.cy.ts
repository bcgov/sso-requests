// Creation of Integration request variants

import data from '../fixtures/sso-requests.json'; // The data file will drive the tests
import Request from '../appActions/Request';
import Utilities from '../appActions/Utilities';
let testData = data;
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
      cy.login(null, null, null, null);
    });
  });

  afterEach(() => {
    cy.logout(null);
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    if (util.runOk(data)) {
      it(`Delete ${data.create.projectname} (Test ID: ${data.create.test_id})`, () => {
        let req = new Request();
        req.showCreateContent(data);
        req.populateCreateContent(data);
        req.getID(data.create.projectname + '@' + util.getDate()).then(() => {
          req.deleteRequest(req.id);
        });
      });
    }
  });
});
