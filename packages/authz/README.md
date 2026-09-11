# @sso/authz

The permission vocabulary and the pure functions over it, to be shared by `app`
and `api`.

**This package has no dependencies and performs no I/O.** That is what makes it
safe to import from a Next.js bundle and an Express server alike. Resolving
permissions _from the database_ stays in each consumer — this package only says
what a permission is, what the named sets contain, and how overlapping scopes
resolve against each other.

It ships with no consumers. `app` and `api` still carry their own authorization
paths, and adopting this vocabulary is the work of the pull requests that follow.
Landing it on its own keeps that diff readable and gives the vocabulary a review
of its own, which is the part hardest to change later.

## What deliberately lives elsewhere

- **Session RBAC** (`appPermissions`, `teamPermissions` in
  `app/utils/authorize.ts`). Those are Keycloak client roles — a different
  authority with a different trust root. Keeping the namespaces apart is what
  makes it impossible to express IdP approval as something an organization could
  confer.
- **Migrations.** `db/src/migrations/*` should carry their own frozen copy of the
  vocabulary. A migration must keep meaning what it meant on the day it ran;
  importing this package there would make past consent shift whenever the
  vocabulary changes.

## Why permission is a set, not a level

`team-member` and `role-manager` are deliberately incomparable: a team member may
write an integration but not create roles, and a role manager is the reverse. No
ordering holds both, so there is no ladder to climb and no "at least this level"
to test. Authority from several sources is their union; a grant bounded by a
ceiling is their intersection. `sets.ts` is those four operations and nothing
else.

## Presets are a presentation concern

What gets stored is always the expansion, never the preset name. Editing a preset
therefore cannot change what a team has already consented to — an existing row
keeps the permissions it was agreed under, and `presetFor` simply returns `null`
for it. Callers render those as a plain permission list rather than snapping them
to a neighbouring preset.
