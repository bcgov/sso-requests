import { PERMISSIONS } from '@sso/authz';
import { commonPermissionsForAppRoles } from '@app/utils/authorize';

/**
 * The app roles resolved into the common permission set. The expansion of each role into app
 * permissions is pinned in authz-characterization; this pins what those app permissions are
 * worth once they have to be compared with team and organization authority.
 */
describe('app roles in the common permission set', () => {
  it('resolves sso-admin to exactly what the admin dashboard admits today', () => {
    expect(commonPermissionsForAppRoles(['sso-admin'])).toEqual([
      'integrations:read',
      'integrations:write',
      'integrations:delete',
      'integrations:reassign-team',
      'roles:read',
      'user-role-mappings:read',
    ]);
  });

  it('gives sso-admin no authority the dashboard does not have', () => {
    const granted = commonPermissionsForAppRoles(['sso-admin']);
    expect(granted).not.toContain('roles:write');
    expect(granted).not.toContain('user-role-mappings:write');
    expect(granted).not.toContain('idp-users:read');
  });

  /**
   * An approver's authority depends on the integration's IdPs, so nothing about it can be
   * resolved from the session alone. It is added per row by resolveAccessForIntegrations.
   */
  it.each(['bceid-approver', 'github-approver', 'social-approver', 'otp-approver', 'bc-services-card-approver'])(
    'resolves %s to nothing on its own',
    (role) => {
      expect(commonPermissionsForAppRoles([role])).toEqual([]);
    },
  );

  it('resolves ordinary users, guests and unknown roles to nothing', () => {
    expect(commonPermissionsForAppRoles(['user'])).toEqual([]);
    expect(commonPermissionsForAppRoles(['guest'])).toEqual([]);
    expect(commonPermissionsForAppRoles(['not-a-role'])).toEqual([]);
    expect(commonPermissionsForAppRoles([])).toEqual([]);
    expect(commonPermissionsForAppRoles()).toEqual([]);
  });

  it('returns a set in vocabulary order, so equal sets are deep-equal', () => {
    const granted = commonPermissionsForAppRoles(['bceid-approver', 'sso-admin']);
    const order = granted.map((permission) => PERMISSIONS.indexOf(permission));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(granted).size).toEqual(granted.length);
  });
});
