/// <reference types="cypress" />
const CONTAINS_DASHBOARD_LINK = 'My Dashboard';
const CONTAINS_REQUEST_INTEGRATION = 'Request Integration';
const CONTAINS_NOT_PROJECT_LEAD_TEXT =
  'We can only process access requests submitted by product owners, project admin or team leads.';
const CONTAINS_NEXT_BUTTON = 'Next';
const CONTAINS_SUBMIT_BUTTON = 'Submit';
const CONTAINS_DELETE_BUTTON = 'Delete';
const CONTAINS_INSTALLATION_JSON = 'Installation JSON';
const CONTAINS_LOGOUT = 'Log out';

const GET_PROJECT_LEAD_FIELDS = '#root_projectLead';
const GET_NEW_TO_SSO_FIELDS = '#root_newToSso';
const GET_PROJECT_NAME = '#root_projectName';
const GET_PUBLIC_ACCESS = '#root_publicAccess';
const GET_DEV_REDIRECT_URIS = '#root_devValidRedirectUris_0';
const GET_DEV_REDIRECT_URIS_1 = '#root_devValidRedirectUris_1';
const GET_TEST_REDIRECT_URIS = '#root_testValidRedirectUris_0';
const GET_PROD_REDIRECT_URIS = '#root_prodValidRedirectUris_0';
const GET_AGREE_WITH_TERMS = '#root_agreeWithTerms';
const backslash = require('backslash');

const projectName = 'cypress test';

const answerRadio = (getBy, answer) => {
  cy.get(getBy).within(() => {
    cy.contains(answer).click();
  });
};

const validateSubmission = (projectName) => {
  cy.contains('tr.active', projectName);
  cy.contains('tr.active', 'Submitted');
  cy.contains(CONTAINS_INSTALLATION_JSON, { timeout: 600000 });
};

beforeEach(() => {
  cy.window().then((win) => {
    win.sessionStorage.setItem('tokens', backslash(Cypress.env('TOKEN')));
  });
  cy.visit(Cypress.env('APP_URL'));
});

describe('Main workflows', () => {
  it('should be logged in', () => {
    cy.contains(CONTAINS_LOGOUT);
  });

  it('should require user to be project lead', () => {
    cy.contains(CONTAINS_DASHBOARD_LINK).click();
    cy.contains(CONTAINS_REQUEST_INTEGRATION).click();
    answerRadio(GET_PROJECT_LEAD_FIELDS, 'No');
    cy.contains(CONTAINS_NOT_PROJECT_LEAD_TEXT);
  });

  it('should allow the user to create a request', () => {
    cy.contains(CONTAINS_DASHBOARD_LINK).click();
    cy.contains(CONTAINS_REQUEST_INTEGRATION).click();

    // Page 1
    answerRadio(GET_PROJECT_LEAD_FIELDS, 'Yes');
    answerRadio(GET_NEW_TO_SSO_FIELDS, 'Yes');
    cy.get(GET_PROJECT_NAME).type(projectName);
    cy.contains('button', CONTAINS_NEXT_BUTTON).click();

    // Page 2
    answerRadio(GET_PUBLIC_ACCESS, 'Public');
    cy.get(GET_DEV_REDIRECT_URIS).type('http://cypress');
    cy.get(GET_TEST_REDIRECT_URIS).type('http://cypress');
    cy.get(GET_PROD_REDIRECT_URIS).type('http://cypress');
    cy.contains('button', CONTAINS_NEXT_BUTTON).click();

    // Page 3
    cy.get(GET_AGREE_WITH_TERMS).click();
    cy.contains('button', CONTAINS_NEXT_BUTTON).click();

    // Submit
    cy.contains('button', CONTAINS_SUBMIT_BUTTON).click();
    cy.contains('.pg-modal-content button', CONTAINS_SUBMIT_BUTTON).click();

    validateSubmission(projectName);

    cy.contains(CONTAINS_DASHBOARD_LINK).click();
    cy.contains(projectName).click();
    cy.contains(projectName)
      .parent('tr')
      .within(() => {
        cy.get('.fa-edit').click();
      });

    cy.contains('Redirect URIs').click();
    cy.contains('Add another URI');

    cy.contains('legend', 'Development')
      .parent('div')
      .within(() => {
        cy.contains('Add another URI').click();
      });

    cy.get(GET_DEV_REDIRECT_URIS_1).type('http://cypress-2');
    cy.contains('button', CONTAINS_SUBMIT_BUTTON).click();

    validateSubmission(projectName);

    cy.contains(CONTAINS_DASHBOARD_LINK).click();
    cy.contains(projectName).click();
    cy.contains(projectName)
      .parent('tr')
      .within(() => {
        cy.get('.fa-trash').click();
      });

    cy.contains('.pg-modal-content button', CONTAINS_DELETE_BUTTON).click();
    cy.contains(projectName).should('not.exist');
  });
});
