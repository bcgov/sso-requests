import { expect, Page } from '@playwright/test';

export type TeamRole = 'Admin' | 'Member';

/** My Dashboard → My Teams. */
export class MyTeams {
  constructor(readonly page: Page) {}

  async goto() {
    if (this.page.url() === 'about:blank') await this.page.goto('/');
    await expect(this.page.getByTestId('desktop-logout-button')).toBeVisible();
    await this.page.getByRole('link', { name: 'My Dashboard' }).click();
    await this.page.getByRole('tab', { name: 'My Teams' }).click();
    await expect(this.page.getByRole('button', { name: '+ Create a New Team' })).toBeVisible();
  }

  row(name: string) {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name, exact: true }) });
  }

  async select(name: string) {
    await this.row(name).getByRole('cell', { name, exact: true }).click();
    await expect(this.page.getByRole('heading', { name: 'Team Details' })).toBeVisible();
  }

  memberRow(email: string) {
    return this.page.getByRole('tabpanel', { name: 'Members' }).getByRole('row').filter({ hasText: email });
  }

  async create(name: string, members: { email: string; role: TeamRole }[] = []) {
    await this.goto();
    await this.page.getByRole('button', { name: '+ Create a New Team' }).click();
    const dialog = this.page.locator('#create-team-modal');
    await dialog.getByRole('textbox', { name: 'Team Name' }).fill(name);
    for (const [i, member] of members.entries()) {
      if (i > 0) await dialog.getByTestId('add-user-role').first().click();
      await this.pickMember(i, member);
    }
    if (members.length === 0) await dialog.getByTestId('delete-user-role').first().click();
    await dialog.getByRole('button', { name: 'Create' }).click();
    await expect(this.row(name)).toBeVisible();
  }

  async rename(from: string, to: string) {
    await this.goto();
    await this.select(from);
    await this.row(from).getByRole('button', { name: 'edit' }).click();
    const dialog = this.page.locator('#edit-team-name-modal');
    await dialog.getByTestId('edit-name').fill(to);
    await dialog.getByTestId('save-edit-name').click();
    await expect(this.row(to)).toBeVisible();
  }

  async addMember(team: string, member: { email: string; role: TeamRole }) {
    await this.goto();
    await this.select(team);
    await this.page.getByTestId('add-new-team-member').click();
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Add a New Team Member' });
    await this.pickMember(0, member);
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(this.page.getByText('Successfully added new members to your team!')).toBeVisible();
    // The modal is skipCloseOnConfirm and onConfirmAdd never closes it on success
    // (app/page-partials/my-dashboard/TeamInfoTabs/index.tsx), so users have to dismiss it by hand. Do the same.
    if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toBeHidden();
    await expect(this.memberRow(member.email)).toBeVisible();
  }

  async removeMember(team: string, email: string) {
    await this.goto();
    await this.select(team);
    await this.memberRow(email).getByTestId('delete-member').click();
    await this.page.locator('#delete-member-modal').getByTestId('confirm-delete-delete-team-member').click();
    await expect(this.memberRow(email)).toHaveCount(0);
  }

  async delete(name: string) {
    await this.goto();
    await this.select(name);
    await this.row(name).getByRole('button', { name: 'delete' }).click();
    await this.page.locator('#delete-team-modal').getByTestId('confirm-delete-delete-team').click();
    await expect(this.row(name)).toHaveCount(0);
  }

  /** Member email is an IDIR lookup combobox (mocked to the seeded additional user in the e2e stack), role a react-select. */
  private async pickMember(index: number, member: { email: string; role: TeamRole }) {
    await this.page.getByTestId(`team-member-email-input-${index}`).fill(member.email.split('@')[0]);
    await this.page.getByRole('option', { name: member.email, exact: false }).click();
    await this.page.locator(`#team-member-role-${index}`).click();
    await this.page.getByRole('option', { name: member.role, exact: true }).click();
  }
}
