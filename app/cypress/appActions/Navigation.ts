class Navigation {
  goToMyDashboard() {
    cy.url().then((url) => {
      cy.log(url);
      if (!url.includes('/my-dashboard')) cy.get('header a[href="/my-dashboard"]').click();
    });
  }

  goToMyTeams() {
    cy.url().then((url) => {
      if (url.includes('/my-dashboard/teams')) return;
      if (url.includes('/my-dashboard') && !url.includes('/teams')) cy.contains('My Teams').click();
      else {
        cy.get('header a[href="/my-dashboard"]').click();
        cy.contains('My Teams').click();
      }
    });
  }

  goToAdminDashboard() {
    cy.url().then((url) => {
      if (!url.endsWith('/admin-dashboard')) cy.get('header a[href="/admin-dashboard"]').click();
    });
  }
}

export default Navigation;
