import { expect, test } from '../../fixtures';
import { ci } from '../../support/env';
import { expectNotProvisioned, expectProvisioned } from '../../support/keycloak';
import {
  browserAndServiceAccount,
  IntegrationSpec,
  oidcConfidential,
  oidcPublic,
  saml,
  serviceAccount,
} from '../../support/integration-spec';

/**
 * Integration CRUD. The scenario matrix covers configurations that produce *different keycloak clients*
 * (protocol, client type, browser vs service-account, IdP scopes, environments). Whether a given field shows up for a
 * given choice is the form schema's business and is unit-tested in app/jest/form.test.tsx.
 */

type Scenario = { title: string; spec: IntegrationSpec; review: Record<string, string> };

const scenarios: Scenario[] = [
  {
    title: 'OIDC public browser login with GitHub BC Gov',
    spec: oidcPublic({ idps: ['githubbcgov'] }),
    review: {
      'Client Protocol': 'OpenID Connect',
      'Client Type': 'Public',
      Usecase: 'Browser Login',
      'Identity Providers Required': 'GitHub BC Gov',
    },
  },
  {
    title: 'OIDC confidential browser login with Digital Credential',
    spec: oidcConfidential({ idps: ['digitalcredential'] }),
    review: {
      'Client Protocol': 'OpenID Connect',
      'Client Type': 'Confidential',
      Usecase: 'Browser Login',
      'Identity Providers Required': 'Digital Credential',
    },
  },
  {
    title: 'OIDC with several IdPs',
    spec: oidcPublic({ idps: ['githubbcgov', 'bceidboth', 'digitalcredential'] }),
    review: { 'Identity Providers Required': 'Basic or Business BCeID, GitHub BC Gov, Digital Credential' },
  },
  {
    title: 'OIDC service account',
    spec: serviceAccount(),
    review: { 'Client Protocol': 'OpenID Connect', Usecase: 'Service Account' },
  },
  {
    title: 'OIDC browser login and service account with BCeID',
    spec: browserAndServiceAccount({ idps: ['bceidboth'] }),
    review: {
      'Client Protocol': 'OpenID Connect',
      Usecase: 'Browser Login & Service Account',
      'Identity Providers Required': 'Basic or Business BCeID',
    },
  },
  {
    title: 'SAML with BCeID',
    spec: saml({ idps: ['bceidboth'] }),
    review: { 'Client Protocol': 'SAML', 'Identity Providers Required': 'Basic or Business BCeID' },
  },
  {
    title: 'OIDC in dev only',
    spec: oidcPublic({
      environments: ['dev'],
      redirectUris: { dev: ['https://example.com/*', 'http://localhost:8080/*'] },
    }),
    review: { 'Dev Redirect URIs': 'https://example.com/*\nhttp://localhost:8080/*' },
  },
];

test.describe('creating an integration', () => {
  for (const { title, spec, review } of scenarios) {
    test(`${title} is provisioned in ${spec.environments.join('+')}`, async ({
      dashboard,
      api,
      kc,
      uniqueName,
      track,
    }) => {
      const name = uniqueName('create');
      track({ kind: 'integration', name, owner: 'user' });
      const form = await dashboard.startRequest();

      await test.step('fill in the form', () => form.fill(spec, name));
      const id = await form.requestId();

      await test.step('review page summarises the request', async () => {
        expect(await form.reviewSummary()).toMatchObject({ 'Project Name': name, ...review });
      });

      await test.step('submit', () => form.submit());

      await test.step('dashboard shows it as completed', () => dashboard.expectStatus(id, 'Completed'));

      await test.step('keycloak clients match the request', async () => {
        const { clientId } = await api.getRequest(id);
        await expectProvisioned(kc, spec, clientId);
      });
    });
  }
});

test.describe('updating an integration', () => {
  test('changing IdPs and redirect URIs updates the clients', async ({ api, dashboard, kc, uniqueName, track }) => {
    const name = uniqueName('update');
    track({ kind: 'integration', name, owner: 'user' });
    const before = oidcPublic({ idps: ['githubbcgov'] });
    const { id, clientId } = await api.createIntegration(before, name);

    const after = oidcPublic({
      idps: ['digitalcredential'],
      redirectUris: { dev: ['https://changed.example.com/*'], test: ['https://changed.example.com/test/*'] },
    });
    await test.step('edit and submit', async () => {
      const form = await dashboard.edit(id);
      await form.update(after);
    });

    await test.step('keycloak clients reflect the change', () => expectProvisioned(kc, after, clientId));
  });

  test('adding production provisions a prod client', async ({ api, dashboard, kc, uniqueName, track }) => {
    const name = uniqueName('add prod');
    track({ kind: 'integration', name, owner: 'user' });
    const before = oidcPublic({ idps: ['digitalcredential'], environments: ['dev', 'test'] });
    const { id, clientId } = await api.createIntegration(before, name);

    const after = oidcPublic({ idps: ['digitalcredential'], environments: ['dev', 'test', 'prod'] });
    await test.step('edit and submit', async () => {
      const form = await dashboard.edit(id);
      await form.update(after);
    });

    await test.step('prod client exists alongside dev and test', () => expectProvisioned(kc, after, clientId));
  });
});

test.describe('deleting an integration', () => {
  test('removes its clients from every environment', async ({ api, dashboard, kc, uniqueName, track }) => {
    const name = uniqueName('delete');
    track({ kind: 'integration', name, owner: 'user' });
    const spec = oidcPublic({ environments: ['dev', 'test'] });
    const { id, clientId } = await api.createIntegration(spec, name);
    await expectProvisioned(kc, spec, clientId);

    await test.step('delete from the dashboard', () => dashboard.delete(id, name));

    await test.step('clients are gone', () => expectNotProvisioned(kc, clientId));
    await test.step('request is archived', async () => {
      expect((await api.listRequests()).map((r) => r.id)).not.toContain(id);
    });
  });
});

test.describe('ownership', () => {
  test('a team-owned integration is shared with the team members', async ({
    api,
    apiAs,
    dashboard,
    uniqueName,
    track,
  }) => {
    const teamName = uniqueName('team');
    track({ kind: 'team', name: teamName, owner: 'user' });
    await api.createTeam(teamName, [{ email: ci.users.additionalUser.email, role: 'member' }]);

    const name = uniqueName('team owned');
    track({ kind: 'integration', name, owner: 'user' });
    const spec = oidcPublic({ ownership: { kind: 'team', teamName } });

    const form = await dashboard.startRequest();
    await form.fill(spec, name);
    expect(await form.reviewSummary()).toMatchObject({ 'Associated Team': teamName });
    await form.submit();

    await test.step('the other team member can see it', async () => {
      const additionalUser = await apiAs('additionalUser');
      await expect.poll(async () => (await additionalUser.listRequests()).map((r) => r.projectName)).toContain(name);
    });
  });

  test('a project-lead integration is private to its requester', async ({ api, apiAs, uniqueName, track }) => {
    const name = uniqueName('private');
    track({ kind: 'integration', name, owner: 'user' });
    await api.createIntegration(oidcPublic(), name);

    const additionalUser = await apiAs('additionalUser');
    expect((await additionalUser.listRequests()).map((r) => r.projectName)).not.toContain(name);
  });
});
