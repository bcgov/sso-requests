# @sso/authz

The permission vocabulary and the pure functions over it, to be shared by `app`
and `api`.

**This package has no dependencies and performs no I/O.** That is what makes it
safe to import from a Next.js bundle and an Express server alike. Resolving
permissions _from the database_ stays in each consumer — this package only says
what a permission is, what the named sets contain, and how an organization's
consented access to a team resolves for one integration.

Both `api` and `app` consume it. In the app, `queries/integrationAccess.ts`
resolves personal ownership, team role, app role and IdP approval into one
`Permission[]` per integration, and `authorizeIntegration` names the permission
at every call site. `queries/accessScope.ts` resolves the row-level half of that
once per request, so a list query's `where` clause and the per-row resolve that
follows it are the same derivation — the app's counterpart to the api's
`accessibleIntegrationsWhere`.

## Two halves of the vocabulary

The first nine permissions are team-scoped: what a team role confers, what a
team API account resolves to, and the only permissions an organization-facing
preset may contain. The rest are admin-scoped — the IdP approval flags,
lifespans, a custom client id, restricted IdPs, the in-flight delete — and reach
an actor only through a Keycloak client role, converted by the app. No preset
contains one, and `team-admin` is an enumerated list rather than
`[...PERMISSIONS]` so that adding an admin-scoped permission changes nothing for
a team admin. `TEAM_SCOPED_PERMISSIONS` names the split and the preset tests hold
it.

## What deliberately lives elsewhere

- **Session RBAC** (`appPermissions`, `teamPermissions` in
  `app/utils/authorize.ts`). Those are Keycloak client roles — a different
  authority with a different trust root. Keeping the namespaces apart is what
  makes it impossible to express IdP approval as something an organization could
  confer. The app converts them _into_ this vocabulary
  (`commonPermissionsForAppRoles`) so they can be unioned with team and
  organization authority; the conversion lives with the roles, not here.
- **Migrations.** `db/src/migrations/*` should carry their own frozen copy of the
  vocabulary. A migration must keep meaning what it meant on the day it ran;
  importing this package there would make past consent shift whenever the
  vocabulary changes.

## Why permission is a set, not a level

`editor` and `role-manager` are deliberately incomparable: an editor may write
the integration but not create roles, and a role manager is the reverse; `admin`
is simply both. No ordering holds them, so there is no ladder to climb and no
"at least this level" to test. Authority from several sources is their union; a
consented set bounded by an override is their intersection. `sets.ts` is those
four operations and nothing else.

## Identity is live, consent is frozen

A team API account _is_ its team, so it resolves to `team-admin` on every
request and gains a new permission the moment the vocabulary does. An
organization's access to a team is a consent record, so what gets stored is the
expanded permission set at the time the team agreed to it. `organization.ts`
resolves that stored set against a per-integration override, which can only
narrow it.

## Presets are a presentation concern

What gets stored is always the expansion, never the preset name. Editing a preset
therefore cannot change what a team has already consented to — an existing row
keeps the permissions it was agreed under, and `presetFor` simply returns `null`
for it. Callers render those as a plain permission list rather than snapping them
to a neighbouring preset.
