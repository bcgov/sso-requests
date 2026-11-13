import { expect, Page } from '@playwright/test';
import { IntegrationForm } from './integration-form';

const padId = (id: number) => String(id).padStart(8, '0');

/** My Dashboard → My Projects. */
export class MyDashboard {
  constructor(readonly page: Page) {}

  /**
   * Navigates in-app. A full page load re-runs keycloak-js check-sso, which redirects back to the app root
   * (NEXT_PUBLIC_SSO_REDIRECT_URI), so deep links don't survive; only the first load is a real navigation.
   */
  async goto() {
    if (this.page.url() === 'about:blank') await this.page.goto('/');
    await expect(this.page.getByTestId('desktop-logout-button')).toBeVisible();
    if (/\/my-dashboard\/integrations/.test(this.page.url())) {
      // Already here: bounce off Home so the list remounts and refetches.
      await this.page.getByRole('link', { name: 'Home', exact: true }).first().click();
    }
    await this.page.getByRole('link', { name: 'My Dashboard' }).click();
    await expect(this.page.getByRole('tab', { name: 'My Projects' })).toBeVisible();
  }

  /** Opens a fresh request form. The draft (and its id) only exists once the first stage autosaves. */
  async startRequest() {
    await this.goto();
    await this.page.getByRole('button', { name: '+ Request SSO Integration' }).click();
    await expect(this.page.getByRole('textbox', { name: 'Project Name' })).toBeVisible();
    return new IntegrationForm(this.page);
  }

  row(id: number) {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: padId(id), exact: true }) });
  }

  async expectStatus(id: number, status: string) {
    // Provisioning is async; the dashboard polls, so give it time and reload once if needed.
    await expect(async () => {
      await this.goto();
      await expect(this.row(id).getByRole('cell').nth(2)).toHaveText(status, { timeout: 5_000 });
    }).toPass({ timeout: 60_000 });
  }

  async edit(id: number) {
    await this.goto();
    await this.row(id).getByRole('button', { name: 'edit' }).click();
    const form = new IntegrationForm(this.page);
    await expect(this.page).toHaveURL(new RegExp(`/request/${id}`));
    return form;
  }

  async delete(id: number, projectName: string) {
    await this.goto();
    await this.row(id).getByRole('button', { name: 'delete' }).click();
    const dialog = this.page.locator(`#delete-modal-${id}`);
    const confirmation = dialog.getByTestId('delete-confirmation-input');
    if (await confirmation.isVisible({ timeout: 1_000 }).catch(() => false)) await confirmation.fill(projectName);
    await dialog.getByRole('button', { name: 'Delete' }).click();
    await expect(this.row(id)).toHaveCount(0);
  }
}
