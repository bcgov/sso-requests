import { dumpAuthDiagnostics } from '../support/authDiagnostics';
import { withCheckSso } from '../support/checkSso';

const NAV_TIMEOUT = 60000;
const NAV_ATTEMPTS = 3;
const SETTLE_MS = 1500;
const AUTH_RELOAD_ATTEMPTS = 2;
const ROUTE_CHANGE_TIMEOUT = 30000;
const ROUTE_CHANGE_POLL_MS = 250;

const loginButton = '[data-testid="desktop-login-button"]';
const logoutButton = '[data-testid="desktop-logout-button"]';

class Navigation {
  waitForPageLoad() {
    cy.get('[data-testid="grid-loading"]', { timeout: NAV_TIMEOUT }).should('not.exist');
  }

  // Keycloak check-sso does a full redirect round-trip on every page load and always returns to the site root
  // (NEXT_PUBLIC_SSO_REDIRECT_URI). Wait until the callback params are consumed and the authenticated layout renders.
  // If the app renders logged out, log the Keycloak traffic and reload to distinguish a transient check-sso failure
  // from a session that has really ended.
  waitForAppReady(reloadsLeft = AUTH_RELOAD_ATTEMPTS) {
    cy.location('hash', { timeout: NAV_TIMEOUT }).should('not.match', /(state|code)=/);
    cy.get(`${loginButton}, ${logoutButton}`, { timeout: NAV_TIMEOUT })
      .should('be.visible')
      .then(($button) => {
        if (!$button.is(loginButton)) return;

        const attempt = AUTH_RELOAD_ATTEMPTS - reloadsLeft + 1;
        dumpAuthDiagnostics(`App rendered logged out (attempt ${attempt}); ${reloadsLeft} reload(s) left`);
        if (reloadsLeft <= 0) throw new Error('App rendered logged out after reloading; Keycloak session has ended');
        cy.reload();
        this.waitForAppReady(reloadsLeft - 1);
      });
    this.waitForPageLoad();
  }

  // Wait for any in-flight reload/SSO redirect to finish so the URL we read is the final one.
  private settle() {
    this.waitForAppReady();
    cy.wait(SETTLE_MS, { log: false });
    this.waitForAppReady();
  }

  // Client-side route changes only update the URL once the target page's code/data has loaded, which can take longer
  // than SETTLE_MS on a slow connection, and some pages (e.g. /my-dashboard) redirect onwards after rendering. Wait for
  // the URL to reach the target, but don't fail if it doesn't; the caller checks where we ended up and retries.
  private waitForPath(expectedPath: string, deadline = Date.now() + ROUTE_CHANGE_TIMEOUT) {
    cy.location('pathname', { log: false }).then((pathname) => {
      if (pathname.startsWith(expectedPath) || Date.now() > deadline) return;
      cy.wait(ROUTE_CHANGE_POLL_MS, { log: false });
      this.waitForPath(expectedPath, deadline);
    });
  }

  // Click a link, let the app settle, and retry if a reload/SSO redirect bounced us back to another page.
  // The last attempt loads the page directly: clicking a link to the page we are already on (e.g. when a redirect from
  // /my-dashboard never happened) does nothing.
  private navigate(click: () => void, expectedPath: string, attempts = NAV_ATTEMPTS) {
    this.settle();
    cy.location('pathname').then((pathname) => {
      if (pathname.startsWith(expectedPath)) return;

      if (attempts <= 1) {
        cy.log(`Loading ${expectedPath} directly, as clicking through left us on ${pathname}`);
        withCheckSso(() => cy.visit(expectedPath));
      } else {
        click();
      }
      this.waitForPath(expectedPath);
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
