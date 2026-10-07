import { Op } from 'sequelize';
import { PRESETS } from '@sso/authz';
import {
  OrganizationAuthContext,
  TeamAuthContext,
  accessibleIntegrationsWhere,
  effectivePermissions,
  isPermitted,
} from '@/modules/authorization';

/**
 * Resolution in isolation, over contexts built by hand. team-scoping.test.ts
 * proves the team branch end to end against the database; this file pins the
 * shape of both branches, including the organization one before the tables
 * that load it exist, so the organization PR only has to fill the maps.
 */

const READ = { resource: 'integrations', action: 'read' } as const;
const WRITE_ROLES = { resource: 'roles', action: 'write' } as const;
const WRITE_INTEGRATION = { resource: 'integrations', action: 'write' } as const;

const teamContext = (teamId: number): TeamAuthContext => ({
  kind: 'team',
  apiClientId: 'team-client',
  apiAccountId: 1,
  teamId,
});

const orgContext = (teams: OrganizationAuthContext['teams']): OrganizationAuthContext => ({
  kind: 'organization',
  apiClientId: 'org-client',
  apiAccountId: 2,
  organizationId: 7,
  teams,
});

const link = (permissions: readonly string[], overrides: [number, readonly string[]][] = []) => ({
  permissions: [...permissions] as any,
  overrides: new Map(overrides.map(([id, set]) => [id, [...set] as any])),
});

describe('a team account', () => {
  const authz = teamContext(10);

  it('is team-admin over an integration in its team', () => {
    expect(effectivePermissions(authz, { id: 1, teamId: 10 })).toEqual(PRESETS['team-admin']);
  });

  it('holds nothing outside its team', () => {
    expect(effectivePermissions(authz, { id: 2, teamId: 11 })).toEqual([]);
    expect(effectivePermissions(authz, { id: 3, teamId: null })).toEqual([]);
  });

  it('lists exactly its team', () => {
    expect(accessibleIntegrationsWhere(authz, READ)).toEqual({ teamId: 10 });
  });
});

describe('an organization account', () => {
  it('reaches only teams with an active link', () => {
    const authz = orgContext(new Map([[10, link(PRESETS.editor)]]));
    expect(effectivePermissions(authz, { id: 1, teamId: 10 })).toEqual(PRESETS.editor);
    expect(effectivePermissions(authz, { id: 2, teamId: 11 })).toEqual([]);
    expect(effectivePermissions(authz, { id: 3, teamId: null })).toEqual([]);
  });

  it('holds what each team consented to, independently', () => {
    const authz = orgContext(
      new Map([
        [10, link(PRESETS.editor)],
        [11, link(PRESETS['role-manager'])],
      ]),
    );
    expect(isPermitted(authz, { id: 1, teamId: 10 }, WRITE_INTEGRATION)).toBe(true);
    expect(isPermitted(authz, { id: 1, teamId: 10 }, WRITE_ROLES)).toBe(false);
    expect(isPermitted(authz, { id: 2, teamId: 11 }, WRITE_ROLES)).toBe(true);
    expect(isPermitted(authz, { id: 2, teamId: 11 }, WRITE_INTEGRATION)).toBe(false);
  });

  describe('an override under a link', () => {
    const authz = orgContext(
      new Map([
        [
          10,
          link(PRESETS.admin, [
            [1, PRESETS.viewer],
            [2, []],
          ]),
        ],
      ]),
    );

    it('caps the integration it names and no other', () => {
      expect(effectivePermissions(authz, { id: 1, teamId: 10 })).toEqual(PRESETS.viewer);
      expect(effectivePermissions(authz, { id: 2, teamId: 10 })).toEqual([]);
      expect(effectivePermissions(authz, { id: 3, teamId: 10 })).toEqual(PRESETS.admin);
    });

    it('cannot widen beyond the link', () => {
      const narrow = orgContext(new Map([[10, link(PRESETS.viewer, [[1, PRESETS.admin]])]]));
      expect(effectivePermissions(narrow, { id: 1, teamId: 10 })).toEqual(PRESETS.viewer);
    });

    /**
     * The override is found through the integration's current team. Once the
     * integration has been reassigned, the row under the old link is simply
     * not consulted — no cleanup is needed for it to stop applying.
     */
    it('is inert once the integration has moved to another team', () => {
      const moved = orgContext(
        new Map([
          [10, link(PRESETS.admin, [[1, []]])],
          [11, link(PRESETS.editor)],
        ]),
      );
      expect(effectivePermissions(moved, { id: 1, teamId: 11 })).toEqual(PRESETS.editor);
    });
  });

  describe('the list predicate', () => {
    it('is null when no link satisfies the requirement', () => {
      expect(accessibleIntegrationsWhere(orgContext(new Map()), READ)).toBeNull();
      expect(accessibleIntegrationsWhere(orgContext(new Map([[10, link(PRESETS.viewer)]])), WRITE_ROLES)).toBeNull();
    });

    it('includes each team whose link satisfies the requirement', () => {
      const authz = orgContext(
        new Map([
          [10, link(PRESETS.editor)],
          [11, link(PRESETS['role-manager'])],
        ]),
      );
      expect(accessibleIntegrationsWhere(authz, READ)).toEqual({ [Op.or]: [{ teamId: 10 }, { teamId: 11 }] });
      expect(accessibleIntegrationsWhere(authz, WRITE_ROLES)).toEqual({ [Op.or]: [{ teamId: 11 }] });
    });

    it('subtracts integrations whose override drops the requirement, per team', () => {
      const authz = orgContext(
        new Map([
          [
            10,
            link(PRESETS.admin, [
              [1, PRESETS.viewer],
              [2, []],
            ]),
          ],
        ]),
      );
      expect(accessibleIntegrationsWhere(authz, READ)).toEqual({ [Op.or]: [{ teamId: 10, id: { [Op.notIn]: [2] } }] });
      expect(accessibleIntegrationsWhere(authz, WRITE_ROLES)).toEqual({
        [Op.or]: [{ teamId: 10, id: { [Op.notIn]: [1, 2] } }],
      });
    });
  });
});
