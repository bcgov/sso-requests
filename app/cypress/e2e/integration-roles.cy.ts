// Creation of Integration request variants

import data from '../fixtures/requests-roles.json'; // The data file will drive the tests
import Request from '../appActions/Request';
import Utilities from '../appActions/Utilities';
let util = new Utilities();
let testData = data;

describe('Create Integration Requests for Roles Testing', () => {
  const requests: Request[] = [];

  const cleanup = () => {
    cy.clearAllCookies();
    cy.setid(null).then(() => {
      cy.login();
    });
    requests.forEach((request) => {
      request.deleteRequest(request.id);
    });
  };

  beforeEach(() => {
    cy.clearAllCookies();
    cy.setid(null).then(() => {
      cy.login();
    });
  });

  afterEach(() => {
    cy.logout();
    cy.clearAllCookies();
  });

  after(() => {
    cleanup();
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case
  testData.forEach((data, index) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(data)) {
      let req = new Request();
      requests.push(req);

      it(`Creates ${data.create.projectname} for roles testing`, () => {
        req.showCreateContent(data);
        req.populateCreateContent(data);
        req.createRequest();
      });

      it(`Can add roles to the request`, () => {
        req.addRoles();
      });

      it(`Can add users to the roles`, () => {
        req.addUserToRoles();
      });

      it(`Can create composite roles`, () => {
        req.createCompositeRoles();
      });

      it(`Can remove roles`, () => {
        req.removeRoles();
      });
    }
  });
});
