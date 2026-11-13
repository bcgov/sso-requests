# CSS app end-to-end tests (Playwright)

Two tiers, one package.

| Tier | Project | Runs against                                          | Auth                                               | When                                    |
| ---- | ------- | ----------------------------------------------------- | -------------------------------------------------- | --------------------------------------- |
| CI   | `ci`    | docker-compose stack (app + 3 local keycloaks)        | Seeded users in the local keycloak, no secrets     | Every PR (`.github/workflows/e2e.yaml`) |
| Live | `live`  | Sandbox app + `dev.sandbox.loginproxy` with real IdPs | Azure IDIR + MFA, BCeID, GitHub (`E2E_LIVE_USERS`) | Weekly / manual (`e2e-keycloak.yaml`)   |

## Running the CI tier locally

```sh
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
# wait for dev/test/prod-kc-migration to exit 0 and http://localhost:3000 to respond
cd e2e
yarn install
npx playwright install chromium
npx playwright test --project=ci          # ~25s
npx playwright show-report                # traces for any failure
```

`docker-compose.e2e.yml` points the app's login at the `css-app-e2e` client in the local dev keycloak, seeded by
`local/terraform/e2e.tf` with three users (`e2e-user`, `e2e-additional-user`, `e2e-admin`, password `password`). They emit the
same claims as an Azure IDIR login (`identity_provider`, `idir_user_guid`, `email`, `client_roles`), so the app can't
tell the difference. The same client is handy for logging into a local stack by hand.

## How the suite is put together

**The form's conditional logic is not tested here.** Rules like "service accounts have no IdPs" or "SAML has no client
type" are schema behaviour and live in `app/jest/form.test.tsx`. E2E proves that a configuration flows UI → API → DB →
keycloak and comes out right.

- `support/integration-spec.ts`: an `IntegrationSpec` describes _what_ an integration is (protocol, usecase, IdPs,
  envs, URIs, ownership). Builders (`oidcPublic()`, `serviceAccount()`, `saml()`, …) return valid defaults; tests
  override only what the scenario is about.
- `pages/integration-form.ts`: maps a spec onto the form stage by stage. Undefined spec fields are not touched, so
  there are no if-chains mirroring the schema. If the form stops rendering a field the spec sets, the locator times out
  naming that field.
- `support/keycloak.ts`: `expectProvisioned(kc, spec, clientId, approvedIdps)` reads the clients the app created in
  each local keycloak and diffs them against the spec (protocol, public/confidential, flows, redirect URIs, IdP scopes).
  This is the main assertion: the UI can say "Completed" while the client is wrong.
- `support/api.ts`: `AppApi` calls the app's own API as any seeded user. Use it to **arrange** things a test isn't about
  (`createIntegration(spec)`, `createTeam`) so UI steps are reserved for the behaviour under test.
- `fixtures.ts`:
  - `track({ kind, name, owner })` registers anything a test creates. It's deleted through the API afterwards, pass or
    fail. Tracking is by unique name, so a test that dies mid-form still cleans up its autosaved draft.
  - `uniqueName(label)` keeps tests safe under `--repeat-each` and parallel workers.
  - `pageAs(role)` opens a second browser context as another user (e.g. an admin approving a request).
- Each test is independent and uses `test.step(...)` for its phases, so a failure reads as e.g.
  `creating an integration › SAML with BCeID › keycloak clients match the request`.

### Adding a scenario

Usually it's one entry in a table, e.g. in `tests/ci/integrations.spec.ts`:

```ts
{
  title: 'OIDC confidential with GitHub BC Gov in dev+test+prod',
  spec: oidcConfidential({ idps: ['githubbcgov'], environments: ['dev', 'test', 'prod'] }),
  review: { 'Client Type': 'Confidential' },
},
```

Add a scenario only if it produces a _different keycloak client_. Field visibility belongs in jest.

### Things worth knowing

- A full page load re-runs keycloak-js `check-sso`, which redirects back to the app root. Deep links don't survive, so
  page objects load `/` once and navigate in-app (`MyDashboard.goto()`).
- Restricted IdPs need admin approval before they reach the client: BCeID in every env, GitHub/OTP/BCSC/Social for
  prod only (`needsApproval`). `expectProvisioned` expects them absent unless passed as approved.
- Deleting an integration while it's still provisioning needs an admin force-delete; cleanup waits for it to settle.

## Live tier

```sh
export E2E_LIVE_USERS='[{"type":"azureidir","username":"PFDRSSOT","email":"…","password":"…","otpsecret":"…"}, …]'
npx playwright test --project=live --workers=1
```

`E2E_LIVE_USERS` has the same shape as the `CYPRESS_USERS` secret (the workflow reuses it). Optional overrides:
`E2E_LIVE_BASE_URL`, `E2E_LIVE_SSO_URL`, `E2E_LIVE_PLAYGROUND_URL`, `E2E_LIVE_CSS_USER`, `E2E_LIVE_CSS_ADMIN`.

- `live-setup` logs into the CSS app with Azure IDIR + TOTP (`support/totp.ts`, RFC 6238) and saves the session.
- Tests create their own dev-only integrations through the API, as the sso-admin, who can add restricted IdPs like IDIR.
  The bearer token is read off the logged-in app's own requests. Integrations are approved if needed and deleted after.
- Session tests use the bcgov OIDC playground as "another app" in the same browser context.
- **Traces and videos are off** for live projects: they record `fill()` values, i.e. real passwords, and CI uploads them
  as artifacts.

## Migration status

The Cypress suite in `app/cypress` still runs alongside. Remove it (`app/cypress`, `app/cypress.config.ts`, the
cypress deps in `app/package.json`, the Cypress workflow jobs, and `CYPRESS_RUNNER` / `CYPRESS_MOCKED_IDIR_LOOKUP` in
`app/utils`) once both Playwright jobs have been green in Actions for a while.
