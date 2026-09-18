import { ORG_CONSENTABLE_PERMISSIONS, Permission } from './permissions';
import { intersect } from './sets';

/**
 * One organization's reach into one team: what the team consented to across the
 * whole team, and the per-integration caps it has placed under that consent.
 *
 * The app and the api both resolve to this shape — the app from the actor's
 * organization memberships, the api from the account's own organization — so
 * one function answers both.
 */
export interface OrganizationLink {
  permissions: Permission[];
  /** Per-integration caps under this link, keyed by integration id. */
  overrides: Map<number, Permission[]>;
}

/**
 * What an organization may do to one integration.
 *
 * `link` is the organization's active row in organization_teams for the
 * integration's *current* team — the permissions the team consented to for the
 * whole team. `override` is the organization_integration_overrides row for
 * this integration under that same link, if one exists.
 *
 * An override can only narrow: it is intersected with the link rather than
 * replacing it, so a link narrowed after the override was written still
 * bounds it, and an empty override is a plain "nothing here". Looking the
 * override up through the integration's current team is what makes a row left
 * behind by a team reassignment inert — it is simply not found.
 *
 * No link means the organization does not reach the team at all, whatever
 * overrides may say.
 */
export const organizationPermissions = (
  link: { permissions: readonly Permission[] } | null | undefined,
  override: readonly Permission[] | null | undefined,
): Permission[] => {
  if (!link) return [];
  const granted = override ? intersect(link.permissions, override) : link.permissions;
  // Bounded again at resolution, not only where a consent is written: a stored
  // row is data, and the one rule an organization can never hold whatever the
  // row says is the one that would take an integration out of its team.
  return intersect(granted, ORG_CONSENTABLE_PERMISSIONS);
};
