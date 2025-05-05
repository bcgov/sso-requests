class Navigation {
  basePath: string = Cypress.env('localtest') ? '' : '/sso-requests-sandbox';
  waitForPageLoad() {
    // Wait for loader to appear and clear to ensure full page load
    cy.get('[data-testid="grid-loading"]').should('exist');
    cy.get('[data-testid="grid-loading"]').should('not.exist');
  }

  goToMyDashboard() {
    cy.url().then((url) => {
      cy.log(url);
      if (!url.includes('/my-dashboard') || url.includes('/teams')) {
        cy.get(`header a[href="${this.basePath}/my-dashboard"]`).click();
        this.waitForPageLoad();
      }
    });
  }

  goToMyTeams() {
    cy.url().then((url) => {
      if (url.includes('/my-dashboard/teams')) return;
      if (url.includes('/my-dashboard') && !url.includes('/teams')) {
        cy.contains('My Teams').click();
        this.waitForPageLoad();
      } else {
        cy.get(`header a[href="${this.basePath}/my-dashboard"]`).click();
        cy.contains('My Teams').click();
        this.waitForPageLoad();
      }
    });
  }

  goToAdminDashboard() {
    cy.url().then((url) => {
      if (!url.endsWith('/admin-dashboard')) cy.get(`header a[href="${this.basePath}/admin-dashboard"]`).click();
    });
  }
}

export default Navigation;
