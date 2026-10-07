import { PERMISSIONS, Permission, intersect, isSubset, permits, sortPermissions, union } from '../src';

describe('permits', () => {
  it('answers a resource and action against a held set', () => {
    const held: Permission[] = ['integrations:read', 'roles:write'];
    expect(permits(held, 'integrations', 'read')).toBe(true);
    expect(permits(held, 'roles', 'write')).toBe(true);
    expect(permits(held, 'integrations', 'write')).toBe(false);
    expect(permits([], 'integrations', 'read')).toBe(false);
  });
});

describe('isSubset', () => {
  it('holds when every proposed permission is within the ceiling', () => {
    expect(isSubset(['integrations:read'], ['integrations:read', 'roles:read'])).toBe(true);
    expect(isSubset([], ['integrations:read'])).toBe(true);
    expect(isSubset(['integrations:write'], ['integrations:read'])).toBe(false);
    expect(isSubset(['integrations:read'], [])).toBe(false);
  });
});

describe('intersect', () => {
  it('bounds a grant by its ceiling', () => {
    expect(intersect(['integrations:read', 'integrations:write'], ['integrations:read', 'roles:read'])).toEqual([
      'integrations:read',
    ]);
  });

  it('is empty when the two sets share nothing', () => {
    expect(intersect(['integrations:read'], ['roles:write'])).toEqual([]);
  });

  /**
   * The reason effective authority is an intersection rather than a minimum: two
   * incomparable sets have no minimum, and picking either one of them would be
   * wrong in a different direction.
   */
  it('is smaller than both inputs when neither contains the other', () => {
    const a: Permission[] = ['integrations:read', 'integrations:write'];
    const b: Permission[] = ['integrations:read', 'roles:write'];
    const result = intersect(a, b);
    expect(result.length).toBeLessThan(a.length);
    expect(result.length).toBeLessThan(b.length);
  });
});

describe('union', () => {
  it('combines authority from several sources', () => {
    expect(union([['integrations:read'], ['roles:write']])).toEqual(['integrations:read', 'roles:write']);
  });

  it('deduplicates and returns the canonical order', () => {
    expect(union([['roles:write', 'integrations:read'], ['integrations:read']])).toEqual([
      'integrations:read',
      'roles:write',
    ]);
  });

  it('is empty for no sources and for empty sources', () => {
    expect(union([])).toEqual([]);
    expect(union([[], []])).toEqual([]);
  });
});

describe('sortPermissions', () => {
  it('puts a set into vocabulary order so equal sets compare deep-equal', () => {
    const scrambled: Permission[] = ['roles:read', 'integrations:read', 'integrations:write'];
    expect(sortPermissions(scrambled)).toEqual(['integrations:read', 'integrations:write', 'roles:read']);
    expect(sortPermissions(scrambled)).toEqual(sortPermissions([...scrambled].reverse()));
  });

  it('deduplicates', () => {
    expect(sortPermissions(['integrations:read', 'integrations:read'])).toEqual(['integrations:read']);
  });

  it('drops nothing from a full set', () => {
    expect(sortPermissions([...PERMISSIONS])).toEqual([...PERMISSIONS]);
  });
});
