// Creation of Integration request variants

import data from '../../fixtures/standalone-requests.json';
import Request from '../../appActions/Request';
import Utilities from '../../appActions/Utilities';
let testData = data;
let util = new Utilities();

describe('Create Integration Requests', () => {
  beforeEach(() => {
    cy.setid(null).then(() => {
      cy.login();
    });
  });

  afterEach(() => {
    cy.logout();
  });

  before(() => {
    cy.cleanGC();
  });

  after(() => {
    cy.cleanGC();
  });

  testData.forEach((data, i) => {
    if (util.runOk(data)) {
      let req = new Request();
      it(`Creates ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        req.populateCreateContent(data);
        req.createRequest();
      });

      it(`Updates ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        req.updateRequest(req.id);
      });
    }
  });
});
