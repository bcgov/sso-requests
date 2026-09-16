import { Permission, PERMISSIONS } from '@sso/authz';
import { appRolePermissionMap, commonPermissionsForAppRoles } from '@app/utils/authorize';

/**
 * The app roles resolved into the common permission set. The expansion of each role into app
 * permissions is pinned in authz-characterization; this pins what those app permissions are
 * worth once they have to be compared with team and organization authority.
 */
describe('app roles in the common permission set', () => {
  it('resolves sso-admin to what the admin dashboard admits, plus every admin-scoped permission', () => {
    expect(commonPermissionsForAppRoles(['sso-admin'])).toEqual([
      'integrations:read',
      'integrations:write',
      'integrations:delete',
      'integrations:reassign-team',
      'roles:read',
      'user-role-mappings:read',
      'integrations:approve-bceid',
      'integrations:approve-github',
      'integrations:approve-bcsc',
      'integrations:approve-social',
      'integrations:approve-otp',
      'integrations:write-lifespans',
      'integrations:write-client-id',
      'integrations:add-restricted-idps',
      'integrations:delete-in-flight',
    ]);
  });

  it('gives sso-admin no authority the dashboard does not have', () => {
    const granted = commonPermissionsForAppRoles(['sso-admin']);
    expect(granted).not.toContain('roles:write');
    expect(granted).not.toContain('user-role-mappings:write');
    expect(granted).not.toContain('idp-users:read');
  });

  /**
   * An approver holds exactly the field authority over their IdP's approval flags, and nothing
   * that would let them reach an integration: integrations:read depends on the integration's
   * IdPs and is added per row by resolveAccessForIntegrations.
   */
  it.each([
    ['bceid-approver', 'integrations:approve-bceid'],
    ['github-approver', 'integrations:approve-github'],
    ['social-approver', 'integrations:approve-social'],
    ['otp-approver', 'integrations:approve-otp'],
    ['bc-services-card-approver', 'integrations:approve-bcsc'],
  ])('resolves %s to only %s', (role, permission) => {
    expect(commonPermissionsForAppRoles([role])).toEqual([permission]);
  });

  it('resolves ordinary users, guests and unknown roles to nothing', () => {
    expect(commonPermissionsForAppRoles(['user'])).toEqual([]);
    expect(commonPermissionsForAppRoles(['guest'])).toEqual([]);
    expect(commonPermissionsForAppRoles(['not-a-role'])).toEqual([]);
    expect(commonPermissionsForAppRoles([])).toEqual([]);
    expect(commonPermissionsForAppRoles()).toEqual([]);
  });

  /**
   * Every lifecycle controller enters on integrations:read and decides the action afterwards, so
   * a role granted the authority to act without the authority to see the row would be refused at
   * the gate before its permission was ever consulted. The approval flags are deliberately not in
   * this list: they are field authority over a row the approver reaches by its IdPs, not reach.
   */
  it('grants integrations:read to every role that may act on an integration', () => {
    const reaching: Permission[] = [
      'integrations:write',
      'integrations:delete',
      'integrations:delete-in-flight',
      'integrations:reassign-team',
    ];
    for (const role of Object.keys(appRolePermissionMap)) {
      const granted = commonPermissionsForAppRoles([role]);
      if (!reaching.some((permission) => granted.includes(permission))) continue;
      expect(granted).toContain('integrations:read');
    }
  });

  it('returns a set in vocabulary order, so equal sets are deep-equal', () => {
    const granted = commonPermissionsForAppRoles(['bceid-approver', 'sso-admin']);
    const order = granted.map((permission) => PERMISSIONS.indexOf(permission));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(granted).size).toEqual(granted.length);
  });
});
