// Creation of Integration request variants

import data from '../../fixtures/idpstopper11.json'; // The data file will drive the tests
import Request from '../../appActions/Request';
import Playground from '../../pageObjects/playgroundPage';
import Utilities from '../../appActions/Utilities';
import { kebabCase } from 'lodash';
import DashboardPage from '../../pageObjects/dashboardPage';

let util = new Utilities();
const dashboardPage = new DashboardPage();

let testData = data;

describe('Run IDP Stopper Test', () => {
  testData.forEach((data, index) => {
    let req = new Request();
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(data)) {
      it(`Create ${data.create.projectname} (Test ID: ${data.create.test_id}) - ${data.create.description}`, () => {
        let integration: Cypress.Chainable | undefined;
        cy.login(util.cssAdmin);
        req.showCreateContent(data);
        req.populateCreateContent(data);
        integration = req.createRequest();

        if (data.approvals.bceid) {
          cy.login(util.cssAdmin);
          req.approveRequest('BCeID Approval', dashboardPage.confirmBceidButton);
        }

        integration?.then(() => {
          let playground = new Playground();

          cy.visit(playground.path);

          playground.fillInPlayground(
            null,
            null,
            kebabCase(data.create.projectname) + '-' + req.uid + '-' + Number(req.id),
            null,
          );

          playground.clickLogin();

          if (data.create.identityprovider[0] == 'Basic BCeID') {
            cy.setid('bceidbasic').then(({ username, password }) => {
              playground.loginBasicBCeID(username, password);
            });
          } else if (data.create.identityprovider[0] == 'Business BCeID') {
            cy.setid('bceidbusiness').then(({ username, password }) => {
              playground.loginBusinesBCeID(username, password);
            });
          } else if (data.create.identityprovider[0] == 'GitHub BC Gov') {
            cy.setid('githubbcgov').then(({ username, password, otpsecret }) => {
              if (!otpsecret) throw new Error('No OTP secret found for githubbcgov');
              playground.loginGithubbcGov(username, password, otpsecret);
            });
          } else if (data.create.identityprovider[0] == 'GitHub') {
            cy.setid('githubpublic').then(({ username, password, otpsecret }) => {
              if (!otpsecret) throw new Error('No OTP secret found for githubpublic');
              playground.loginGithubbcGov(username, password, otpsecret);
            });
          }
          cy.window().then((w) => w.focus());
          cy.contains('button', 'Token Parsed', { timeout: 10000 }).click();
          cy.contains('td', 'family_name').siblings().should('be.empty');
          playground.clickLogout();
        });
      });

      it('Delete the request', () => {
        cy.login(util.cssAdmin);
        req.deleteRequest(req.id);
      });
    }
  });
});
