const NAV_TIMEOUT = 20000;
const NAV_ATTEMPTS = 3;

class Navigation {
  waitForPageLoad() {
    cy.get('[data-testid="grid-loading"]', { timeout: NAV_TIMEOUT }).should('not.exist');
  }

  // Keycloak check-sso may bounce through the IdP and back to "/" after cy.visit; clicks made during that
  // window are lost. Wait for the callback params to be consumed and the authenticated layout to render.
  waitForAppReady() {
    cy.location('hash', { timeout: NAV_TIMEOUT }).should('not.match', /(state|code)=/);
    cy.get('[data-testid="desktop-logout-button"]', { timeout: NAV_TIMEOUT }).should('be.visible');
    this.waitForPageLoad();
  }

  // Click a link and confirm the URL changed, retrying if the navigation was swallowed by a redirect.
  private navigate(click: () => void, expectedPath: string, attempts = NAV_ATTEMPTS) {
    this.waitForAppReady();
    click();

    cy.then(() => {
      const deadline = Date.now() + 10000;
      const check = (): void => {
        cy.location('pathname', { log: false }).then((pathname) => {
          if (pathname.startsWith(expectedPath)) return;
          if (Date.now() < deadline) {
            cy.wait(250, { log: false });
            check();
            return;
          }
          if (attempts <= 1) throw new Error(`Failed to navigate to ${expectedPath}; still on ${pathname}`);
          cy.log(`Navigation to ${expectedPath} did not complete, retrying`);
          this.navigate(click, expectedPath, attempts - 1);
        });
      };
      check();
    });

    cy.location('pathname', { timeout: NAV_TIMEOUT }).should('include', expectedPath);
    this.waitForPageLoad();
  }

  private clickMyDashboard() {
    cy.get(`[data-testid="desktop-nav"] a[href="/my-dashboard"]`, { timeout: NAV_TIMEOUT }).click();
  }

  goToMyDashboard() {
    cy.location('pathname').then((pathname) => {
      if (pathname.startsWith('/my-dashboard/integrations')) return;
      this.navigate(() => this.clickMyDashboard(), '/my-dashboard/integrations');
    });
  }

  goToMyTeams() {
    cy.location('pathname').then((pathname) => {
      if (pathname.startsWith('/my-dashboard/teams')) return;
      if (!pathname.startsWith('/my-dashboard')) {
        this.navigate(() => this.clickMyDashboard(), '/my-dashboard/integrations');
      }
      this.navigate(() => cy.contains('My Teams', { timeout: NAV_TIMEOUT }).click(), '/my-dashboard/teams');
    });
  }

  goToAdminDashboard() {
    cy.location('pathname').then((pathname) => {
      if (pathname.endsWith('/admin-dashboard')) return;
      this.navigate(
        () => cy.get(`[data-testid="desktop-nav"] a[href="/admin-dashboard"]`, { timeout: NAV_TIMEOUT }).click(),
        '/admin-dashboard',
      );
    });
  }
}

export default Navigation;
