import { PRESETS, Permission, organizationPermissions } from '../src';

const READ: Permission[] = ['integrations:read'];

describe('organizationPermissions', () => {
  it('confers nothing without a link to the integration team', () => {
    expect(organizationPermissions(undefined, undefined)).toEqual([]);
    expect(organizationPermissions(null, [...PRESETS.admin])).toEqual([]);
  });

  it('confers the link permissions when nothing overrides them', () => {
    expect(organizationPermissions({ permissions: PRESETS.editor }, undefined)).toEqual(PRESETS.editor);
    expect(organizationPermissions({ permissions: PRESETS.editor }, null)).toEqual(PRESETS.editor);
  });

  /**
   * An override is intersected, not substituted. That is what makes it a
   * restriction by construction rather than by a write-time check that can
   * drift once the link is later narrowed.
   */
  describe('an override only narrows', () => {
    it('drops what the override does not name', () => {
      expect(organizationPermissions({ permissions: PRESETS.editor }, READ)).toEqual(READ);
    });

    it('cannot add what the link does not hold', () => {
      expect(organizationPermissions({ permissions: PRESETS.viewer }, [...PRESETS.admin])).toEqual(PRESETS.viewer);
    });

    it('treats an empty override as no access to that integration', () => {
      expect(organizationPermissions({ permissions: PRESETS.admin }, [])).toEqual([]);
    });
  });

  it('returns a copy rather than the link array itself', () => {
    const link = { permissions: [...PRESETS.viewer] };
    const result = organizationPermissions(link, undefined);
    result.push('roles:write');
    expect(link.permissions).toEqual(PRESETS.viewer);
  });
});
