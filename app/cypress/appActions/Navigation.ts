class Navigation {
  basePath: string = Cypress.env('localtest') ? '' : '/sso-requests-sandbox';
  goToMyDashboard() {
    cy.url().then((url) => {
      cy.log(url);
      if (!url.includes('/my-dashboard')) cy.get(`header a[href="${this.basePath}/my-dashboard"]`).click();
    });
  }

  goToMyTeams() {
    cy.url().then((url) => {
      if (url.includes('/my-dashboard/teams')) return;
      if (url.includes('/my-dashboard') && !url.includes('/teams')) cy.contains('My Teams').click();
      else {
        cy.get(`header a[href="${this.basePath}/my-dashboard"]`).click();
        cy.contains('My Teams').click();
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
