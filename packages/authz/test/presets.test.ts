import {
  ORG_FACING_PRESETS,
  PERMISSIONS,
  PRESETS,
  PRESET_DESCRIPTIONS,
  PRESET_LABELS,
  Permission,
  PresetName,
  describePermissions,
  isSubset,
  permissionsForTeamRole,
  presetFor,
  sortPermissions,
} from '../src';

describe('preset invariants', () => {
  it('keeps every preset within the vocabulary', () => {
    for (const permissions of Object.values(PRESETS)) {
      expect(isSubset(permissions, [...PERMISSIONS])).toBe(true);
    }
  });

  it('orders every preset canonically so equal sets compare equal', () => {
    for (const permissions of Object.values(PRESETS)) {
      expect(permissions).toEqual(sortPermissions(permissions));
    }
  });

  it('labels and describes every preset', () => {
    for (const name of Object.keys(PRESETS) as PresetName[]) {
      expect(PRESET_LABELS[name]).toBeTruthy();
      expect(PRESET_DESCRIPTIONS[name]).toBeTruthy();
    }
  });

  /**
   * The reason permission is a set rather than a rung on a ladder. If someone
   * later tidies the presets into a hierarchy, this fails rather than silently
   * changing what a team member may do.
   */
  it('keeps team-member and role-manager incomparable', () => {
    expect(isSubset(PRESETS['role-manager'], PRESETS['team-member'])).toBe(false);
    expect(isSubset(PRESETS['team-member'], PRESETS['role-manager'])).toBe(false);
  });

  it('separates editing an integration from deleting it and from moving it', () => {
    expect(PRESETS['team-member']).toContain('integrations:write');
    expect(PRESETS['team-member']).not.toContain('integrations:delete');
    expect(PRESETS.editor).toContain('integrations:delete');
  });

  /**
   * Ownership is the team's to change. An organization may be consented to the
   * broadest preset there is and still not move an integration out of its team.
   */
  it('withholds team reassignment from every organization-facing preset', () => {
    for (const name of ORG_FACING_PRESETS) {
      expect(PRESETS[name]).not.toContain('integrations:reassign-team');
    }
    expect(PRESETS['team-member']).toContain('integrations:reassign-team');
    expect(PRESETS['team-admin']).toContain('integrations:reassign-team');
  });

  it('offers only the org-facing presets to an organization', () => {
    expect(ORG_FACING_PRESETS).toEqual(['none', 'viewer', 'role-manager', 'editor']);
    expect(ORG_FACING_PRESETS).not.toContain('team-member');
    expect(ORG_FACING_PRESETS).not.toContain('team-admin');
  });
});

/**
 * F1. `team-admin` covers the whole vocabulary today, and that has to stay a fact
 * about the list rather than its definition. Spelling the set out here means the
 * next permission added to the vocabulary does not silently join it: a new
 * permission leaves this assertion passing and team admins unchanged, and
 * granting it to them requires editing both the preset and this test.
 *
 * Defined as `[...PERMISSIONS]` instead, adding `integrations:approve-bceid`
 * would make every team admin — and every personal-integration owner, who
 * resolves to the same preset — an IdP approver, with nothing to review.
 */
describe('F1: team-admin is enumerated, not derived', () => {
  it('holds exactly the permissions it names', () => {
    expect(PRESETS['team-admin']).toEqual([
      'integrations:read',
      'integrations:write',
      'integrations:delete',
      'integrations:reassign-team',
      'roles:read',
      'roles:write',
      'user-role-mappings:read',
      'user-role-mappings:write',
      'idp-users:read',
    ]);
  });

  it('covers the vocabulary as it stands today', () => {
    expect(PRESETS['team-admin']).toEqual(sortPermissions([...PERMISSIONS]));
  });
});

describe('presetFor', () => {
  it('names a stored set that matches a preset', () => {
    expect(presetFor(PRESETS.viewer)).toBe('viewer');
    expect(presetFor(PRESETS.editor)).toBe('editor');
    expect(presetFor([])).toBe('none');
  });

  it('matches regardless of the order the set is stored in', () => {
    expect(presetFor([...PRESETS.viewer].reverse())).toBe('viewer');
  });

  /**
   * A set matching no current preset is not an error — it is a consent frozen
   * under a preset that has since been edited. It keeps its permissions and
   * loses only its name.
   */
  it('returns null for a set matching no preset', () => {
    expect(presetFor(['integrations:delete'])).toBeNull();
  });
});

describe('describePermissions', () => {
  it('uses the preset label when there is one', () => {
    expect(describePermissions(PRESETS.viewer)).toBe(PRESET_LABELS.viewer);
    expect(describePermissions([])).toBe('No access');
  });

  it('lists the permissions rather than snapping to a neighbouring preset', () => {
    const orphan: Permission[] = ['integrations:delete'];
    expect(describePermissions(orphan)).toBe('Custom (integrations:delete)');
  });
});

describe('permissionsForTeamRole', () => {
  it('expresses team roles in the same currency as organization access', () => {
    expect(permissionsForTeamRole('admin')).toEqual(PRESETS['team-admin']);
    expect(permissionsForTeamRole('member')).toEqual(PRESETS['team-member']);
  });

  it('confers nothing for a missing or unknown role', () => {
    expect(permissionsForTeamRole(undefined)).toEqual([]);
    expect(permissionsForTeamRole(null)).toEqual([]);
    expect(permissionsForTeamRole('')).toEqual([]);
    expect(permissionsForTeamRole('owner')).toEqual([]);
  });
});
