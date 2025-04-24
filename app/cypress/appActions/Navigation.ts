class Navigation {
  goToMyDashboard() {
    cy.get('a[href="/my-dashboard/integrations"]').click();
  }

  goToMyTeams() {
    cy.get('a[href="/my-dashboard/teams"]').click();
  }

  goToAdminDashboard() {
    cy.get('a[href="/admin-dashboard"]').click();
  }
}

export default Navigation;
