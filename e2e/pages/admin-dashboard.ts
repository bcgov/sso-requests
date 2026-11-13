import { expect, Page } from '@playwright/test';
import type { KcEnv } from '../support/env';

/** Approval tabs on the SSO (admin) dashboard, keyed by the IdP family they approve. */
const approvalTabs = {
  bceid: { tab: 'BCeID Approval', confirm: 'confirm-delete-bceid-approve' },
  github: { tab: 'GitHub Prod', confirm: 'confirm-delete-github-approve' },
  digitalCredential: { tab: 'Digital Credential Prod', confirm: 'confirm-delete-digital-credential-approve' },
  bcsc: { tab: 'BC Services Card Prod', confirm: 'confirm-delete-bc-services-card-approve' },
  otp: { tab: 'OTP Prod', confirm: 'confirm-delete-otp-approve' },
  social: { tab: 'Social Prod', confirm: 'confirm-delete-social-approve' },
} as const;

/** SSO Dashboard (requires an sso-admin). */
export class AdminDashboard {
  constructor(readonly page: Page) {}

  async goto() {
    if (this.page.url() === 'about:blank') await this.page.goto('/');
    await expect(this.page.getByTestId('desktop-logout-button')).toBeVisible();
    await this.page.getByRole('link', { name: 'SSO Dashboard' }).click();
  }

  /** Searches for the integration (the list is paginated across every request) and selects it. */
  async open(projectName: string) {
    await this.goto();
    const search = this.page.getByRole('textbox', { name: 'Project ID, Project Name or Client ID' });
    await search.fill(projectName);
    await search.press('Enter');
    // The details panel repeats the name, so take the results-table row.
    await this.page.getByRole('row').filter({ hasText: projectName }).first().click();
  }

  /** BCeID is approved per environment. */
  async approveBceid(envs: KcEnv[]) {
    await this.page.getByRole('tab', { name: approvalTabs.bceid.tab }).click();
    for (const env of envs) {
      await this.page.getByTestId(`approve-${env}-button`).click();
      await this.page.getByTestId(approvalTabs.bceid.confirm).click();
      await expect(this.page.getByTestId(`bceid-${env}-approved-note`)).toBeVisible();
    }
  }

  /** Everything else is approved for prod only. */
  async approveProd(idp: Exclude<keyof typeof approvalTabs, 'bceid'>) {
    const { tab, confirm } = approvalTabs[idp];
    await this.page.getByRole('tab', { name: tab }).click();
    await this.page.getByRole('button', { name: 'Approve Prod' }).click();
    await this.page.getByTestId(confirm).click();
    await expect(this.page.getByText(/Approved by/)).toBeVisible();
  }
}
