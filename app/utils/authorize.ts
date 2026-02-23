export const appPermissions = {
  VIEW_TEAMS: 'view_teams',
  ADD_RESTRICTED_IDPS: 'add_restricted_idps',
  UPDATE_REQUEST_ADDITIONAL_SETTINGS: 'update_request_additional_settings',
  UPDATE_REQUEST_META_DATA: 'update_request_metadata',
  UPDATE_SAML_REQUEST_CLIENT_ID: 'update_saml_request_client_id',
  ADD_REQUEST_COMMENT: 'update_request_comment',
  ADMIN_DASHBOARD_VIEW_REQUEST: 'admin_dashboard_view_request',
  ADMIN_DASHBOARD_VIEW_ALL_REQUESTS: 'admin_dashboard_view_all_requests',
  ADMIN_DASHBOARD_UPDATE_REQUEST: 'admin_dashboard_update_request',
  ADMIN_DASHBOARD_DELETE_REQUEST: 'admin_dashboard_delete_request',
  ADMIN_DASHBOARD_RESTORE_REQUEST: 'admin_dashboard_restore_request',
  ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS: 'admin_dashboard_view_request_events',
  ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS: 'admin_dashboard_view_request_idp_events',
  ADMIN_DASHBOARD_VIEW_IDPS_FILTER: 'admin_dashboard_idps_filter',
  VIEW_TERMS_AND_CONDITIONS: 'view_terms_and_conditions',
  VIEW_MY_DASHBOARD: 'view_my_dashboard',
  VIEW_ADMIN_DASHBOARD: 'view_admin_dashboard',
  ADMIN_DASHBOARD_VIEW_REQUEST_ROLES: 'admin_dashboard_view_request_roles',
  ADMIN_DASHBOARD_VIEW_ROLES_USERS: 'admin_dashboard_view_roles_users',
  DOWNLOAD_ADMIN_REPORTS: 'download_admin_reports',
  APPROVE_BC_SERVICES_CARD: 'approve_bc_services_card',
  APPROVE_OTP: 'approve_otp',
  APPROVE_GITHUB: 'approve_github',
  APPROVE_BCEID: 'approve_bceid',
  APPROVE_SOCIAL: 'approve_social',
};

export const teamPermissions = {
  UPDATE_REQUEST: 'update_request',
  DELETE_REQUEST: 'delete_request',

  MANAGE_ROLES: 'manage_roles',

  DELETE_TEAM: 'delete_team',
  UPDATE_TEAM: 'update_team',
  ADD_MEMBER: 'add_member',
  REMOVE_MEMBER: 'remove_member',
  UPDATE_MEMBER_ROLE: 'update_member_role',

  MANAGE_TEAM_API_ACCOUNTS: 'manage_team_api_accounts',
};

export const teamRolePermissionMap: Record<string, string[]> = {
  admin: [
    teamPermissions.DELETE_REQUEST,
    teamPermissions.UPDATE_REQUEST,
    teamPermissions.MANAGE_ROLES,
    teamPermissions.DELETE_TEAM,
    teamPermissions.UPDATE_TEAM,
    teamPermissions.ADD_MEMBER,
    teamPermissions.REMOVE_MEMBER,
    teamPermissions.UPDATE_MEMBER_ROLE,
    teamPermissions.MANAGE_TEAM_API_ACCOUNTS,
  ],
  member: [teamPermissions.UPDATE_REQUEST],
};

export const appRolePermissionMap: Record<string, string[]> = {
  guest: [appPermissions.VIEW_TERMS_AND_CONDITIONS],
  user: [appPermissions.VIEW_MY_DASHBOARD],
  'sso-admin': [
    appPermissions.VIEW_TEAMS,
    appPermissions.ADD_REQUEST_COMMENT,
    appPermissions.UPDATE_REQUEST_META_DATA,
    appPermissions.UPDATE_SAML_REQUEST_CLIENT_ID,
    appPermissions.ADD_RESTRICTED_IDPS,
    appPermissions.UPDATE_REQUEST_ADDITIONAL_SETTINGS,
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST,
    appPermissions.ADMIN_DASHBOARD_VIEW_ALL_REQUESTS,
    appPermissions.ADMIN_DASHBOARD_DELETE_REQUEST,
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_EVENTS,
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_ROLES,
    appPermissions.ADMIN_DASHBOARD_VIEW_ROLES_USERS,
    appPermissions.ADMIN_DASHBOARD_RESTORE_REQUEST,
    appPermissions.ADMIN_DASHBOARD_UPDATE_REQUEST,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.DOWNLOAD_ADMIN_REPORTS,
    appPermissions.ADMIN_DASHBOARD_VIEW_IDPS_FILTER,
    appPermissions.APPROVE_BC_SERVICES_CARD,
    appPermissions.APPROVE_OTP,
    appPermissions.APPROVE_GITHUB,
    appPermissions.APPROVE_BCEID,
    appPermissions.APPROVE_SOCIAL,
  ],
  'bc-services-card-approver': [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.APPROVE_BC_SERVICES_CARD,
  ],
  'bceid-approver': [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.APPROVE_BCEID,
  ],
  'otp-approver': [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.APPROVE_OTP,
  ],
  'github-approver': [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.APPROVE_GITHUB,
  ],
  'social-approver': [
    appPermissions.ADMIN_DASHBOARD_VIEW_REQUEST_IDP_EVENTS,
    appPermissions.VIEW_MY_DASHBOARD,
    appPermissions.VIEW_ADMIN_DASHBOARD,
    appPermissions.APPROVE_SOCIAL,
  ],
};

export const hasTeamPermission = (role: string | undefined, permission: string) => {
  if (!role) return false;
  const permissions = teamRolePermissionMap[role];
  if (!permissions) return false;
  return permissions.includes(permission);
};

export const hasAppPermission = (roles: string[] = [], permission: string) => {
  if (roles.length === 0) return false;
  for (const role of roles) {
    const permissions = appRolePermissionMap[role];
    if (permissions && permissions.includes(permission)) {
      return true;
    }
  }
  return false;
};

export const getAllAppPermissions = (roles: string[]) => {
  const permissionsSet = new Set<string>();
  roles.forEach((role) => {
    const permissions = appRolePermissionMap[role];
    if (permissions) {
      permissions.forEach((permission) => permissionsSet.add(permission));
    }
  });
  return Array.from(permissionsSet);
};
