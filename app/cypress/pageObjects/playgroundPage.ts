import { authenticator } from 'otplib';

class PlaygroundPage {
  path: string = 'https://bcgov.github.io/keycloak-example-apps/';
  header: string = 'Keycloak OIDC Playground';

  // Element Selectors
  authServerUrl: string = 'input[name="url"]';
  realm: string = 'input[name="realm"]';
  clientId: string = 'input[name="clientId"]';
  idpHint: string = 'input[name="idpHint"]';
  commonButton: string = 'button';

  fillInPlayground = (url: string | null, realm: string | null, client: string, idpHint: string | null) => {
    this.selectConfig();
    this.setAuthServerUrl(url);
    this.setRealm(realm);
    this.setClientId(client);
    this.clickUpdate();
    cy.wait(2000);
    if (idpHint !== null) {
      this.selectOptions();
      this.setIDPHint(idpHint);
      this.clickUpdate();
    }
    // Wait is needed to allow keycloak.js to update client. Watching the network request is not enough
    // as it needs more time for the local update as well. There is not a good ui indicator for this.
    cy.wait(2000);
    this.selectConfig();
  };

  // Helper functions
  selectConfig() {
    cy.get('div').contains('Keycloak OIDC Config').click({ force: true });
  }

  selectOptions() {
    cy.get('div').contains('Keycloak Login Options').click({ force: true });
  }

  setAuthServerUrl(url: string | null = 'https://dev.sandbox.loginproxy.gov.bc.ca/auth') {
    // Check if url is null and set the default value if it is
    url = url === null ? 'https://dev.sandbox.loginproxy.gov.bc.ca/auth' : url;

    cy.get(this.authServerUrl).clear().type(url);
  }

  setRealm(realm: string | null = 'standard') {
    // Check if realm is null and set the default value if it is
    realm = realm === null ? 'standard' : realm;

    cy.get(this.realm).clear().type(realm);
  }

  setClientId(clientId: string) {
    cy.get(this.clientId).clear().type(clientId);
  }

  setIDPHint(idpHint: string) {
    cy.get(this.idpHint).clear().type(idpHint);
  }

  clickUpdate() {
    cy.get('.content.active').contains(this.commonButton, 'Update').click({ force: true });
  }

  clickLogin() {
    Cypress.session.clearAllSavedSessions();
    cy.clearAllCookies();
    cy.contains(this.commonButton, 'Login', { timeout: 10000 }).click({ force: true });
  }

  clickLogout() {
    cy.contains(this.commonButton, 'Logout', { timeout: 10000 }).click({ force: true });
  }

  checkProviders(providers: string[]) {
    if (providers.length > 1) {
      // On the IDP Select Page, select/test the IDP
      cy.get('#kc-social-providers').within(() => {
        let n = 0;
        while (n < providers.length) {
          if (providers[n] !== '') {
            cy.contains('li', providers[n]);
          }
          n++;
        }
      });
    }
  }

  // Login functions for different IDPs
  loginBasicBCeID(username: string, password: string) {
    cy.get('#login-to', { timeout: 20000 }).contains('Log in to sfstest7.gov.bc.ca');
    cy.contains('div', 'Use a Basic BCeID').should('be.visible');
    cy.get('#user').type(username, { log: false });
    cy.get('#password').type(password, { log: false });
    cy.get('input[type="submit"]', { timeout: 20000 }).click();
    cy.get('body').then((bodyElement) => {
      if (bodyElement.find('input[type="submit"]').length > 0) {
        cy.get('input[type="submit"]').click();
      }
    });
  }

  loginBusinesBCeID(username: string, password: string) {
    cy.get('#login-to', { timeout: 20000 }).contains('Log in to sfstest7.gov.bc.ca');
    cy.contains('div', 'Use a Business BCeID').should('be.visible');
    cy.get('#user').type(username, { log: false });
    cy.get('#password').type(password, { log: false });
    cy.get('input[type="submit"]', { timeout: 20000 }).click();
    cy.get('body').then((bodyElement) => {
      if (bodyElement.find('input[type="submit"]').length > 0) {
        cy.get('input[type="submit"]').click();
      }
    });
  }

  loginGithubbcGov(username: string, password: string, secret: string) {
    cy.contains('p', 'GitHub', { timeout: 20000 }).should('be.visible');
    cy.get('#login_field').type(username, { log: false });
    cy.get('#password').type(password, { log: false });
    cy.get('input[type="submit"]', { timeout: 20000 }).click();
    const token = authenticator.generate(secret);
    cy.get('#app_totp', { timeout: 10000 }).type(token, { log: false });
    cy.contains('Verify').click();
  }

  loginIDIR(username: string, password: string) {
    cy.get('#login-to', { timeout: 20000 }).contains('Log in to sfstest7.gov.bc.ca');
    cy.contains('label', 'IDIR Username').should('be.visible');
    cy.get('#user').type(username, { log: false });
    cy.get('#password').type(password, { log: false });
    cy.get('input[type="submit"]', { timeout: 20000 }).click();
  }

  loginGithub = (username: string, password: string, secret: string) => {
    cy.get('input#login_field').type(username, { log: false });
    cy.get('input#password').type(password, { log: false });
    cy.get('input[type="submit"]').click();
    const token = authenticator.generate(secret);
    cy.get('#app_totp', { timeout: 10000 }).type(token, { log: false });
    cy.contains('Verify').click();

    cy.wait(2000);
    cy.get('body').then((bodyElement) => {
      if (bodyElement.find('button:contains("Confirm")').length > 0) {
        cy.get('button:contains("Confirm")').click();
      }
    });
  };
}

export default PlaygroundPage;
