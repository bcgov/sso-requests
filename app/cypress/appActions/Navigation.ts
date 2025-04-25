class Navigation {
  goToMyDashboard() {
    cy.get('header a[href="/my-dashboard"]').click();
  }

  goToMyTeams() {
    cy.get('header a[href="/my-dashboard"]').click();
    cy.contains('My Teams').click();
  }

  goToAdminDashboard() {
    cy.get('header a[href="/admin-dashboard"]').click();
  }
}

export default Navigation;
