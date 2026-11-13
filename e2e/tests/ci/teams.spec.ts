import { expect, test } from '../../fixtures';
import { MyTeams } from '../../pages/my-teams';
import { ci } from '../../support/env';
import { oidcPublic } from '../../support/integration-spec';

const additionalUser = ci.users.additionalUser.email;

/** Team CRUD and membership. Membership is asserted from the added user's own point of view via the API. */
test.describe('teams', () => {
  test('creating a team with a member shares it with them', async ({ page, apiAs, uniqueName, track }) => {
    const name = uniqueName('team');
    track({ kind: 'team', name, owner: 'user' });

    await new MyTeams(page).create(name, [{ email: additionalUser, role: 'Member' }]);

    const additionalUserApi = await apiAs('additionalUser');
    await expect.poll(async () => (await additionalUserApi.listTeams()).map((t) => t.name)).toContain(name);
  });

  test('renaming a team', async ({ page, api, uniqueName, track }) => {
    const before = uniqueName('team');
    const after = `${before} renamed`;
    track({ kind: 'team', name: before, owner: 'user' });
    track({ kind: 'team', name: after, owner: 'user' });
    await api.createTeam(before);

    await new MyTeams(page).rename(before, after);

    const names = (await api.listTeams()).map((t) => t.name);
    expect(names).toContain(after);
    expect(names).not.toContain(before);
  });

  test('adding and removing a member changes what they can see', async ({ page, api, apiAs, uniqueName, track }) => {
    const name = uniqueName('team');
    track({ kind: 'team', name, owner: 'user' });
    await api.createTeam(name);
    const teams = new MyTeams(page);
    const additionalUserApi = await apiAs('additionalUser');

    await test.step('add', async () => {
      await teams.addMember(name, { email: additionalUser, role: 'Member' });
      await expect.poll(async () => (await additionalUserApi.listTeams()).map((t) => t.name)).toContain(name);
    });

    await test.step('remove', async () => {
      await teams.removeMember(name, additionalUser);
      await expect.poll(async () => (await additionalUserApi.listTeams()).map((t) => t.name)).not.toContain(name);
    });
  });

  test('deleting an empty team', async ({ page, api, uniqueName, track }) => {
    const name = uniqueName('team');
    track({ kind: 'team', name, owner: 'user' });
    await api.createTeam(name);

    await new MyTeams(page).delete(name);

    expect((await api.listTeams()).map((t) => t.name)).not.toContain(name);
  });

  test('a team that owns integrations cannot be deleted', async ({ page, api, uniqueName, track }) => {
    const name = uniqueName('team');
    track({ kind: 'team', name, owner: 'user' });
    const team = await api.createTeam(name);
    const integration = uniqueName('team integration');
    track({ kind: 'integration', name: integration, owner: 'user' });
    await api.createIntegration(oidcPublic({ ownership: { kind: 'team', teamId: team.id } }), integration);

    const teams = new MyTeams(page);
    await teams.goto();
    await teams.select(name);
    await expect(teams.row(name).getByRole('button', { name: 'delete' })).toBeDisabled();
  });
});
