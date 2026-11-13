import { expect, Page } from '@playwright/test';
import type { KcEnv } from '../support/env';

const envTab: Record<KcEnv, string> = { dev: 'Dev', test: 'Test', prod: 'Prod' };

/** The Role Management and Assign Users to Roles tabs of an integration's details panel. */
export class RolesPanel {
  constructor(readonly page: Page) {}

  private get panel() {
    return this.page.getByRole('tabpanel', { name: 'Role Management' });
  }

  async openRoleManagement(env: KcEnv) {
    await this.page.getByRole('tab', { name: 'Role Management' }).click();
    await this.panel.getByRole('tab', { name: envTab[env], exact: true }).click();
  }

  roleRow(role: string) {
    return this.panel.getByRole('row').filter({ has: this.page.getByRole('cell', { name: role, exact: true }) });
  }

  async createRole(env: KcEnv, role: string) {
    await this.openRoleManagement(env);
    await this.panel.getByRole('button', { name: '+ Create a New Role' }).click();
    const dialog = this.page.getByRole('dialog');
    await dialog.getByTestId('role-name-input-field').first().fill(role);
    await dialog.getByTestId('modal-confirm-btn-create-new-role').click();
    await expect(dialog).toBeHidden();
    await expect(this.roleRow(role)).toBeVisible();
  }

  async deleteRole(env: KcEnv, role: string) {
    await this.openRoleManagement(env);
    const row = this.roleRow(role);
    await row.getByRole('button', { name: 'delete' }).click();
    await this.page.getByTestId('modal-confirm-btn-delete-role').click();
    await expect(row).toHaveCount(0);
  }

  async addComposite(env: KcEnv, parent: string, child: string) {
    await this.openRoleManagement(env);
    await this.roleRow(parent).click();
    await this.page.getByRole('tab', { name: 'Composite Roles' }).click();
    // The picker renders beside (not inside) the Composite Roles tab panel; it's the only combobox in Role Management.
    const picker = this.panel.getByRole('combobox');
    await picker.fill(child);
    await this.page.getByRole('option', { name: child, exact: true }).click();
    await expect(this.page.getByText('Last saved at')).toBeVisible();
  }

  /** Finds a user by first name in `env` + `idpLabel` and gives them `role`. */
  async assignUser(env: KcEnv, idpLabel: string, firstName: string, role: string) {
    await this.page.getByRole('tab', { name: 'Assign Users to Roles' }).click();
    const panel = this.page.getByRole('tabpanel', { name: 'Assign Users to Roles' });
    const [envSelect, idpSelect, criterionSelect] = [0, 1, 2].map((i) => panel.getByRole('combobox').nth(i));
    await this.choose(envSelect, envTab[env]);
    await this.choose(idpSelect, idpLabel);
    await this.choose(criterionSelect, 'Name');
    await panel.getByRole('textbox', { name: 'Enter search criteria' }).fill(firstName);
    await panel.getByRole('button', { name: 'Search' }).click();
    await panel.getByTestId('role-search-table').getByRole('cell', { name: firstName, exact: false }).first().click();
    const assign = panel.getByRole('combobox', { name: 'Assign User to a Role' });
    await assign.click();
    await this.page.getByRole('option', { name: role, exact: true }).click();
    await expect(this.page.getByText('Last saved at')).toBeVisible();
  }

  private async choose(select: ReturnType<Page['getByRole']>, option: string) {
    await select.click();
    await this.page.getByRole('option', { name: option, exact: true }).click();
  }
}
