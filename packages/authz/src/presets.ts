import { Permission } from './permissions';
import { sortPermissions, union } from './sets';

const order = (permissions: Permission[]): Permission[] => sortPermissions(permissions);

const VIEWER: Permission[] = order(['integrations:read', 'roles:read', 'user-role-mappings:read']);
// The two organization-facing capabilities are independent, not rungs: a team
// may let an organization manage roles without touching the integration, or
// edit the integration without touching roles. idp-users:read sits with role
// management because a role cannot be assigned without first looking the user
// up.
const ROLE_MANAGER: Permission[] = order([...VIEWER, 'roles:write', 'user-role-mappings:write', 'idp-users:read']);
const EDITOR: Permission[] = order([...VIEWER, 'integrations:write', 'integrations:delete']);
// Both, and nothing more. In particular not reassign-team: ownership stays the
// team's to change, however broad the organization's access.
const ADMIN: Permission[] = union([ROLE_MANAGER, EDITOR]);

// Named sets. Presets are a presentation concern: what is stored is always the
// expansion, so editing a preset never changes what a team already consented to.
export const PRESETS = {
  none: [] as Permission[],
  viewer: VIEWER,
  'role-manager': ROLE_MANAGER,
  editor: EDITOR,
  admin: ADMIN,
  'team-member': order([
    ...VIEWER,
    'integrations:write',
    'integrations:reassign-team',
    'user-role-mappings:write',
    'idp-users:read',
  ]),
  // A team admin's authority, and therefore a team API account's: the account
  // is the team, so it resolves to this preset live rather than to a stored
  // copy of it.
  'team-admin': order([
    'integrations:read',
    'integrations:write',
    'integrations:delete',
    'integrations:reassign-team',
    'roles:read',
    'roles:write',
    'user-role-mappings:read',
    'user-role-mappings:write',
    'idp-users:read',
  ]),
} as const;

export type PresetName = keyof typeof PRESETS;

export const ORG_FACING_PRESETS: PresetName[] = ['none', 'viewer', 'role-manager', 'editor', 'admin'];

export const PRESET_LABELS: Record<PresetName, string> = {
  none: 'No access',
  viewer: 'Viewer',
  'role-manager': 'Role Manager',
  editor: 'Editor',
  admin: 'Admin',
  'team-member': 'Team Member',
  'team-admin': 'Team Admin',
};

export const PRESET_DESCRIPTIONS: Record<PresetName, string> = {
  none: 'Cannot see or change anything.',
  viewer: 'Can view roles, role assignments and integration details.',
  'role-manager': 'Everything a Viewer can do, plus creating roles and assigning them to users.',
  editor:
    'Everything a Viewer can do, plus updating and deleting the integration itself, and reading or rotating its client secrets.',
  admin: 'Everything a Role Manager and an Editor can do, including rotating client secrets.',
  'team-member': 'Can update the integration and assign roles, but not create them.',
  'team-admin': 'Full control of the integration.',
};

// The name a stored set was chosen under, or null when it matches none of the
// current presets. Null is not an error: a frozen consent keeps the expansion
// it was agreed under, so an edited preset leaves correct rows with no name.
// Callers render those as a plain permission list.
export const presetFor = (permissions: readonly Permission[]): PresetName | null => {
  const sorted = sortPermissions(permissions);
  const match = (Object.keys(PRESETS) as PresetName[]).find((name) => {
    const preset = sortPermissions(PRESETS[name]);
    return preset.length === sorted.length && preset.every((permission, index) => permission === sorted[index]);
  });
  return match ?? null;
};

// How a stored set is named on screen. A set matching no current preset is
// shown as its permissions rather than snapped to a neighbouring preset, so an
// edited preset never misrepresents what a team already agreed to.
export const describePermissions = (permissions: readonly Permission[]): string => {
  const name = presetFor(permissions);
  if (name) return PRESET_LABELS[name];
  const sorted = sortPermissions(permissions);
  return sorted.length === 0 ? 'No access' : `Custom (${sorted.join(', ')})`;
};

// Team roles expressed in the same currency as organization access, so the two
// can be merged rather than checked down separate paths.
export const permissionsForTeamRole = (role: string | undefined | null): Permission[] => {
  if (role === 'admin') return PRESETS['team-admin'];
  if (role === 'member') return PRESETS['team-member'];
  return [];
};
