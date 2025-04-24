class Navigation {
  goToMyDashboard() {
    cy.get('a[href="/my-dashboard"]').click();
  }

  goToMyTeams() {
    cy.get('a[href="/my-dashboard"]').click();
    cy.contains('My Teams').click();
  }

  goToAdminDashboard() {
    cy.get('a[href="/admin-dashboard"]').click();
  }
}

export default Navigation;
