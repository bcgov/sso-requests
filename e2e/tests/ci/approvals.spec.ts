import { test } from '../../fixtures';
import { AdminDashboard } from '../../pages/admin-dashboard';
import { expectProvisioned } from '../../support/keycloak';
import { oidcPublic } from '../../support/integration-spec';

/**
 * Restricted IdPs are requested by the integration owner but only reach the keycloak client once an SSO admin
 * approves them. Each test checks the client before and after, so a broken gate shows up either way.
 */
test.describe('IdP approvals', () => {
  test('BCeID is added to each environment once an admin approves it there', async ({
    api,
    kc,
    pageAs,
    uniqueName,
    track,
  }) => {
    const name = uniqueName('bceid approval');
    track({ kind: 'integration', name, owner: 'user' });
    const spec = oidcPublic({ idps: ['bceidboth'], environments: ['dev', 'test'] });
    const { clientId } = await api.createIntegration(spec, name);

    await test.step('withheld until approved', () => expectProvisioned(kc, spec, clientId));

    await test.step('admin approves dev and test', async () => {
      const admin = new AdminDashboard(await pageAs('admin'));
      await admin.open(name);
      await admin.approveBceid(['dev', 'test']);
    });

    await test.step('present after approval', () => expectProvisioned(kc, spec, clientId, ['bceidboth']));
  });

  test('GitHub BC Gov reaches prod only after admin approval', async ({ api, kc, pageAs, uniqueName, track }) => {
    const name = uniqueName('github approval');
    track({ kind: 'integration', name, owner: 'user' });
    const spec = oidcPublic({ idps: ['githubbcgov'], environments: ['dev', 'test', 'prod'] });
    const { clientId } = await api.createIntegration(spec, name);

    await test.step('dev and test have it, prod does not', () => expectProvisioned(kc, spec, clientId));

    await test.step('admin approves prod', async () => {
      const admin = new AdminDashboard(await pageAs('admin'));
      await admin.open(name);
      await admin.approveProd('github');
    });

    await test.step('prod has it after approval', () => expectProvisioned(kc, spec, clientId, ['githubbcgov']));
  });
});
