const NAV_TIMEOUT = 20000;
const NAV_ATTEMPTS = 3;
const SETTLE_MS = 1500;

class Navigation {
  waitForPageLoad() {
    cy.get('[data-testid="grid-loading"]', { timeout: NAV_TIMEOUT }).should('not.exist');
  }

  // Keycloak check-sso does a full redirect round-trip on every page load and always returns to the site root
  // (NEXT_PUBLIC_SSO_REDIRECT_URI). Wait until the callback params are consumed and the authenticated layout renders.
  waitForAppReady() {
    cy.location('hash', { timeout: NAV_TIMEOUT }).should('not.match', /(state|code)=/);
    cy.get('[data-testid="desktop-logout-button"]', { timeout: NAV_TIMEOUT }).should('be.visible');
    this.waitForPageLoad();
  }

  // Wait for any in-flight reload/SSO redirect to finish so the URL we read is the final one.
  private settle() {
    this.waitForAppReady();
    cy.wait(SETTLE_MS, { log: false });
    this.waitForAppReady();
  }

  // Click a link, let the app settle, and retry if a reload/SSO redirect bounced us back to another page.
  private navigate(click: () => void, expectedPath: string, attempts = NAV_ATTEMPTS) {
    this.settle();
    cy.location('pathname').then((pathname) => {
      if (pathname.startsWith(expectedPath)) return;

      click();
      this.settle();

      cy.location('pathname').then((finalPath) => {
        if (finalPath.startsWith(expectedPath)) return;
        if (attempts <= 1) throw new Error(`Failed to navigate to ${expectedPath}; ended up on ${finalPath}`);
        cy.log(`Navigation to ${expectedPath} was redirected to ${finalPath}, retrying`);
        this.navigate(click, expectedPath, attempts - 1);
      });
    });
  }

  private clickMyDashboard() {
    cy.get(`[data-testid="desktop-nav"] a[href="/my-dashboard"]`, { timeout: NAV_TIMEOUT }).click();
  }

  goToMyDashboard() {
    this.navigate(() => this.clickMyDashboard(), '/my-dashboard/integrations');
  }

  goToMyTeams() {
    this.settle();
    cy.location('pathname').then((pathname) => {
      if (pathname.startsWith('/my-dashboard/teams')) return;
      if (!pathname.startsWith('/my-dashboard')) this.goToMyDashboard();
      this.navigate(() => cy.contains('My Teams', { timeout: NAV_TIMEOUT }).click(), '/my-dashboard/teams');
    });
  }

  goToAdminDashboard() {
    this.navigate(
      () => cy.get(`[data-testid="desktop-nav"] a[href="/admin-dashboard"]`, { timeout: NAV_TIMEOUT }).click(),
      '/admin-dashboard',
    );
  }
}

export default Navigation;
