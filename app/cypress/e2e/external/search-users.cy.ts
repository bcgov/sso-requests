// Creation of pre-reqs for test

import searchIntegration from '../../fixtures/search-test-integration.json';
import rolesData from '../../fixtures/rolesusers.json';
import idimData from '../../fixtures/idim-search.json';
import Request from '../../appActions/Request';
import Playground from '../../pageObjects/playgroundPage';
import Utilities from '../../appActions/Utilities';
var kebabCase = require('lodash.kebabcase');

let util = new Utilities();
let playground = new Playground();

const cookiesToClear: string[] = [
  'KEYCLOAK_SESSION_LEGACY',
  'KEYCLOAK_SESSION',
  'KEYCLOAK_REMEMBER_ME',
  'KEYCLOAK_LOCALE',
  'KEYCLOAK_IDENTITY_LEGACY',
  'KEYCLOAK_IDENTITY',
  'KC_RESTART',
  'FORMCRED',
  'AUTH_SESSION_ID_LEGACY',
];
const domain: string = Cypress.env('siteminder');

describe('Create Integration Requests', () => {
  const req = new Request();

  beforeEach(() => {
    cy.cleanGC();
    cy.clearAllSessionStorage();
    cy.clearAllLocalStorage();
    cy.clearAllCookies();
    // Clear Cookies
    cookiesToClear.forEach((cookieName) => {
      cy.clearCookie(cookieName, { domain });
    });
  });
  afterEach(() => {
    cy.cleanGC();
    cy.clearAllSessionStorage();
    cy.clearAllLocalStorage();
    cy.clearAllCookies();
    // Clear Cookies
    cookiesToClear.forEach((cookieName) => {
      cy.clearCookie(cookieName, { domain });
    });
  });

  after(() => {
    cy.clearAllCookies();
    cy.setid(null).then(() => {
      cy.login();
    });
    req.deleteRequest(req.id);
    req.deleteTeam();
  });

  // Iterate through the JSON file and create a team for each entry
  // The set up below allows for reporting on each test case

  if (util.runOk(searchIntegration)) {
    it(`Can create the integration for seach tests`, () => {
      cy.setid(null).then(() => {
        cy.login();
      });
      req.showCreateContent(searchIntegration);
      req.populateCreateContent(searchIntegration);
      req.createRequest();
      cy.logout();
    });

    it(`Login with bceidbasic`, () => {
      cy.session('bceidbasic', () => {
        cy.visit(playground.path);
        const clientName = kebabCase(`${req.projectName}@$${req.uid} ${Number(req.id)}`);
        playground.fillInPlayground(null, null, clientName, 'bceidbasic');

        playground.clickLogin();
        cy.wait(2000);

        cy.setid('bceidbasic').then(() => {
          playground.loginBasicBCeID(Cypress.env('username'), Cypress.env('password'));
        });

        cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
        playground.clickLogout();
      });
    });

    it(`Login with bceidbusiness`, () => {
      cy.session('bceidbusiness', () => {
        cy.visit(playground.path);
        const clientName = kebabCase(`${req.projectName}@$${req.uid} ${Number(req.id)}`);
        playground.fillInPlayground(null, null, clientName, 'bceidbusiness');

        playground.clickLogin();
        cy.wait(2000);

        cy.setid('bceidbusiness').then(() => {
          playground.loginBusinesBCeID(Cypress.env('username'), Cypress.env('password'));
        });

        cy.get('button', { timeout: 10000 }).contains('Logout').should('exist');
        playground.clickLogout();
      });
    });
  }

  rolesData.forEach((value) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(value)) {
      it(`Search for user: "${value.id + '@' + util.getDate()}": ${value.environment} - ${value.idp} - ${
        value.criterion
      }`, () => {
        cy.setid(null).then(() => {
          cy.login();
        });

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

  idimData.forEach((value, index) => {
    // Only run the test if the smoketest flag is set and the test is a smoketest
    if (util.runOk(value)) {
      it(`Search IDIM: "${value.id + '@' + util.getDate()}": ${value.environment} - ${value.idp} - ${
        value.criterion
      }`, () => {
        cy.setid(null).then(() => {
          cy.login();
        });
        req.searchIdim(req.id, value.environment, value.idp, value.criterion, value.error, value.search_value);
      });
    }
  });
});
