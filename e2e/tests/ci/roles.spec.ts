import { expect, test as base } from '../../fixtures';
import { RolesPanel } from '../../pages/roles';
import { oidcPublic } from '../../support/integration-spec';

/**
 * Client roles are managed directly in keycloak through the app, so every assertion here reads keycloak.
 * The integration itself is arranged through the API and opened in the dashboard.
 */
const test = base.extend<{ integration: { id: number; clientUuid: string }; roles: RolesPanel }>({
  integration: async ({ api, kc, uniqueName, track }, use) => {
    const name = uniqueName('roles');
    track({ kind: 'integration', name, owner: 'user' });
    const { id, clientId } = await api.createIntegration(oidcPublic({ idps: ['githubbcgov'] }), name);
    const client = await kc.findClient('dev', clientId);
    await use({ id, clientUuid: client!.id! });
  },
  roles: async ({ page, dashboard, integration }, use) => {
    await dashboard.goto();
    await dashboard.row(integration.id).click();
    await use(new RolesPanel(page));
  },
});

test.describe('roles', () => {
  test('creating and deleting a role', async ({ roles, kc, integration }) => {
    await test.step('create', async () => {
      await roles.createRole('dev', 'e2e-viewer');
      await expect.poll(() => kc.clientRoles('dev', integration.clientUuid)).toContain('e2e-viewer');
    });

    await test.step('delete', async () => {
      await roles.deleteRole('dev', 'e2e-viewer');
      await expect.poll(() => kc.clientRoles('dev', integration.clientUuid)).not.toContain('e2e-viewer');
    });
  });

  test('a role can be made a composite of another', async ({ roles, kc, integration }) => {
    await roles.createRole('dev', 'e2e-admin');
    await roles.createRole('dev', 'e2e-viewer');
    await roles.addComposite('dev', 'e2e-admin', 'e2e-viewer');

    await expect.poll(() => kc.compositeRoles('dev', integration.clientUuid, 'e2e-admin')).toEqual(['e2e-viewer']);
  });

  test('assigning a role to an IdP user', async ({ page, dashboard, kc, integration, uniqueName }) => {
    // Arrange the role and a user directly in keycloak; creating roles through the UI is covered above.
    await kc.createClientRole('dev', integration.clientUuid, 'e2e-viewer');
    // A user as a GitHub BC Gov login would leave it in the standard realm.
    const firstName = uniqueName('gh').replace(/\W/g, '');
    const userId = await kc.createUser('dev', {
      guid: `${firstName}guid`.toLowerCase(),
      idp: 'githubbcgov',
      firstName,
      lastName: 'Tester',
      email: `${firstName.toLowerCase()}@example.com`,
    });

    try {
      await dashboard.goto();
      await dashboard.row(integration.id).click();
      await new RolesPanel(page).assignUser('dev', 'GitHub BC Gov', firstName, 'e2e-viewer');
      await expect.poll(() => kc.userClientRoles('dev', userId, integration.clientUuid)).toEqual(['e2e-viewer']);
    } finally {
      await kc.deleteUser('dev', userId);
    }
  });
});
