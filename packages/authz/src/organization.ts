import { Permission } from './permissions';
import { intersect } from './sets';

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
  return override ? intersect(link.permissions, override) : [...link.permissions];
};
