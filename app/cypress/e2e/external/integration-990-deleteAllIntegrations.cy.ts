import Request from '../../appActions/Request';
import Utility from '../../appActions/Utilities';
let util = new Utility();

describe('Delete All Integrations', () => {
  let req = new Request();
  it('Delete All Requests as default user', function () {
    cy.login();
    req.deleteAllRequests();
  });
});
