import { PermissionRow, resolvePermissions, rowsForTeam } from '../src';

const READ: PermissionRow['permissions'] = ['integrations:read'];
const WRITE: PermissionRow['permissions'] = ['integrations:write'];
const ROLES: PermissionRow['permissions'] = ['roles:read'];

const row = (overrides: Partial<PermissionRow> = {}): PermissionRow => ({
  teamId: null,
  integrationId: null,
  permissions: [],
  ...overrides,
});

describe('rowsForTeam', () => {
  it('keeps a row naming the team', () => {
    const rows = [row({ teamId: 7, permissions: WRITE })];
    expect(rowsForTeam(rows, 7)).toEqual(rows);
  });

  it('drops a row naming a different team', () => {
    const rows = [row({ teamId: 9, permissions: WRITE })];
    expect(rowsForTeam(rows, 7)).toEqual([]);
  });

  it('keeps a row naming no team, which applies to every team', () => {
    const rows = [row({ permissions: WRITE })];
    expect(rowsForTeam(rows, 7)).toEqual(rows);
    expect(rowsForTeam(rows, 9)).toEqual(rows);
  });

  it('keeps only the team-less rows when the target belongs to no team', () => {
    const rows = [row({ teamId: 7, permissions: WRITE }), row({ permissions: READ })];
    expect(rowsForTeam(rows, null)).toEqual([row({ permissions: READ })]);
  });

  /**
   * The failure this function exists to prevent. Resolving a mixed set without
   * narrowing it first lets one team's grant answer for another, and the wrong
   * answer is a wider one.
   */
  it('separates the grants of an account that holds several teams', () => {
    const grants = [row({ teamId: 7, permissions: WRITE }), row({ teamId: 9, permissions: ROLES })];
    expect(resolvePermissions(rowsForTeam(grants, 7), null)).toEqual(WRITE);
    expect(resolvePermissions(rowsForTeam(grants, 9), null)).toEqual(ROLES);
  });
});

describe('resolvePermissions', () => {
  describe('most specific wins', () => {
    it('prefers the row naming the integration to the row naming none', () => {
      const rows = [row({ integrationId: 42, permissions: READ }), row({ permissions: WRITE })];
      expect(resolvePermissions(rows, 42)).toEqual(READ);
    });

    it('falls back to the row naming no integration', () => {
      const rows = [row({ integrationId: 42, permissions: READ }), row({ permissions: WRITE })];
      expect(resolvePermissions(rows, 99)).toEqual(WRITE);
    });

    it('confers nothing when neither row is present', () => {
      expect(resolvePermissions([row({ integrationId: 42, permissions: READ })], 99)).toEqual([]);
      expect(resolvePermissions([], 42)).toEqual([]);
    });

    it('answers across every integration when asked with null', () => {
      const rows = [row({ integrationId: 42, permissions: READ }), row({ permissions: WRITE })];
      expect(resolvePermissions(rows, null)).toEqual(WRITE);
    });
  });

  /**
   * The distinction that decides whether a carve-out is possible at all. An
   * absent row means "nothing said here, try the broader row"; a row holding an
   * empty set means "nothing, and that is the answer".
   */
  describe('an empty set is an answer, not a silence', () => {
    const rows = [row({ integrationId: 42, permissions: [] }), row({ permissions: WRITE })];

    it('stops at a row holding no permissions', () => {
      expect(resolvePermissions(rows, 42)).toEqual([]);
    });

    it('still confers the broader set on integrations the carve-out does not name', () => {
      expect(resolvePermissions(rows, 99)).toEqual(WRITE);
    });
  });

  it('treats a missing permissions array as an empty set', () => {
    const rows = [{ teamId: null, integrationId: 42 }] as unknown as PermissionRow[];
    expect(resolvePermissions(rows, 42)).toEqual([]);
  });

  /**
   * Team scoping is not this function's job. A caller that hands it a mixed set
   * gets whichever row it finds first, which is why rowsForTeam is separate and
   * mandatory for callers that hold more than one team's rows.
   */
  it('ignores the team column entirely', () => {
    const rows = [row({ teamId: 9, integrationId: 42, permissions: READ })];
    expect(resolvePermissions(rows, 42)).toEqual(READ);
  });
});
