import { expect, Locator, Page } from '@playwright/test';
import type { KcEnv } from '../support/env';
import { envLabels, Idp, idpLabels, IntegrationSpec, usesBrowserLogin } from '../support/integration-spec';

type Stage =
  | 'requester-info'
  | 'basic-info'
  | 'development'
  | 'test'
  | 'production'
  | 'terms-and-conditions'
  | 'review-submit';
const envStage: Record<KcEnv, Stage> = { dev: 'development', test: 'test', prod: 'production' };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The integration request form (rjsf). Maps an IntegrationSpec onto the form one stage at a time.
 *
 * Every setter is a no-op for an undefined spec value, so the spec decides which conditional fields get touched;
 * this class never re-implements the schema's show/hide rules. If the form stops rendering a field the spec sets,
 * the locator times out with the field name in the error — which is exactly the regression you want to hear about.
 */
export class IntegrationForm {
  constructor(readonly page: Page) {}

  /** Request id from the URL (/request/:id). The form autosaves a draft as soon as it's opened. */
  async requestId() {
    await expect(this.page).toHaveURL(/\/request\/\d+/);
    return Number(this.page.url().match(/\/request\/(\d+)/)![1]);
  }

  async goToStage(stage: Stage) {
    await this.waitForSave();
    await this.page.getByTestId(`stage-${stage}`).click();
  }

  async next() {
    await this.waitForSave();
    await this.page.getByRole('button', { name: 'Next' }).click();
  }

  /** Fills every stage from the spec and stops on Review & Submit. */
  async fill(spec: IntegrationSpec, projectName: string) {
    await this.fillRequesterInfo(spec, projectName);
    await this.next();
    await this.fillBasicInfo(spec);
    for (const env of spec.environments) {
      await this.goToStage(envStage[env]);
      await this.fillEnvironment(spec, env);
    }
    await this.goToStage('terms-and-conditions');
    await this.page.getByRole('checkbox', { name: 'I agree to the Terms and Conditions' }).check();
    await this.goToStage('review-submit');
  }

  /** Edits an existing integration to match `spec` (basic info + environments) and submits the update. */
  async update(spec: IntegrationSpec) {
    await this.goToStage('basic-info');
    await this.fillBasicInfo(spec);
    for (const env of spec.environments) {
      await this.goToStage(envStage[env]);
      await this.fillEnvironment(spec, env);
    }
    await this.goToStage('review-submit');
    await this.submit();
  }

  async fillRequesterInfo(spec: IntegrationSpec, projectName?: string) {
    if (projectName !== undefined) await this.page.getByRole('textbox', { name: 'Project Name' }).fill(projectName);

    const usesTeam = spec.ownership.kind === 'team';
    await this.setSwitch(this.page.getByRole('switch', { name: 'Project Team' }), usesTeam);
    if (spec.ownership.kind === 'team') {
      // react-select combobox
      await this.page.locator('#root_teamId').fill(spec.ownership.teamName!);
      await this.page.getByRole('option', { name: spec.ownership.teamName!, exact: true }).click();
    } else {
      await this.setSwitch(
        this.page.getByRole('switch', { name: 'Are you the product owner or technical contact for this project?' }),
        true,
      );
    }
  }

  async fillBasicInfo(spec: IntegrationSpec) {
    const p = this.page;
    await p.getByRole('radio', { name: spec.protocol === 'oidc' ? 'OpenID Connect' : 'SAML' }).check();
    if (spec.authType) {
      const label = {
        'browser-login': 'Browser Login',
        'service-account': 'Service Account',
        both: 'Browser Login and Service Account',
      }[spec.authType];
      await p.getByRole('radio', { name: label, exact: true }).check();
    }
    if (spec.publicAccess !== undefined) {
      await p.getByRole('radio', { name: spec.publicAccess ? 'Public' : 'Confidential' }).check();
    }
    if (spec.idps) await this.setIdps(spec.idps);

    // Development is always on and disabled.
    await p.getByRole('checkbox', { name: envLabels.test }).setChecked(spec.environments.includes('test'));
    await p.getByRole('checkbox', { name: envLabels.prod }).setChecked(spec.environments.includes('prod'));

    if (spec.additionalRoleAttribute !== undefined) {
      await p.getByRole('textbox', { name: 'Additional Role Attribute (optional)' }).fill(spec.additionalRoleAttribute);
    }
  }

  /** Makes the selected IdPs exactly `idps`. Checkboxes for IdPs the spec doesn't mention are cleared. */
  async setIdps(idps: Idp[]) {
    const group = this.page.locator('#root_devIdps');
    for (const [idp, label] of Object.entries(idpLabels) as [Idp, string][]) {
      // Restricted IdPs get a " Restricted" suffix in their accessible name.
      const box = group.getByRole('checkbox', { name: new RegExp(`^${escape(label)}( Restricted)?$`) });
      if (!(await box.isVisible())) {
        if (idps.includes(idp)) throw new Error(`IdP "${label}" is not offered on the form`);
        continue;
      }
      const want = idps.includes(idp);
      if ((await box.isChecked()) === want) continue;
      await box.setChecked(want);
      if (want) await this.dismissIdpModals();
    }
  }

  /** Some IdPs pop an acknowledgement (e.g. BCeID warning) when selected. */
  private async dismissIdpModals() {
    const ack = this.page.getByRole('dialog').getByRole('button', { name: 'I Understand' });
    if (await ack.isVisible({ timeout: 500 }).catch(() => false)) await ack.click();
  }

  async fillEnvironment(spec: IntegrationSpec, env: KcEnv) {
    if (!usesBrowserLogin(spec)) return;
    const uris = spec.redirectUris?.[env];
    if (!uris) return;
    for (const [i, uri] of uris.entries()) {
      const input = this.page.locator(`#root_${env}ValidRedirectUris_${i}`);
      if (!(await input.isVisible())) await this.page.getByText('Add another URI').click();
      await input.fill(uri);
    }
  }

  /**
   * The Review & Submit summary table as label -> value, for asserting what the user is about to submit.
   * Multi-value fields (e.g. redirect URIs) render as a list in a label-less row under their label; they come back
   * newline-joined.
   */
  async reviewSummary() {
    const rows = this.page.getByRole('table').first().getByRole('row');
    await expect(rows.first()).toBeVisible();
    const summary: Record<string, string> = {};
    let last: string | undefined;
    for (const row of await rows.all()) {
      const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
      if (cells[0]?.endsWith(':')) {
        last = cells[0].replace(/:$/, '');
        summary[last] = cells[1] ?? '';
      } else if (last && cells.length === 1 && !summary[last]) {
        summary[last] = cells[0];
      }
    }
    return summary;
  }

  /** Submit (new) or Update (applied), confirm, and wait to land back on the dashboard. */
  async submit() {
    await this.waitForSave();
    await this.page.getByRole('button', { name: /^(Submit|Update)$/ }).click();
    await this.page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
    await this.page.waitForURL(/\/my-dashboard|\/admin-dashboard/);
  }

  private async waitForSave() {
    await expect(this.page.getByTestId('rotating-lines-svg')).toHaveCount(0);
  }

  /** react-switch keeps its input visually hidden under the handle; toggle it like a keyboard user would. */
  private async setSwitch(sw: Locator, on: boolean) {
    if ((await sw.isChecked()) !== on) {
      await sw.focus();
      await sw.press('Space');
    }
    if (on) await expect(sw).toBeChecked();
    else await expect(sw).not.toBeChecked();
  }
}
