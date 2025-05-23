import type { Status } from './types';

export type PrimaryEndUser = 'livingInBC' | 'businessInBC' | 'bcGovEmployees' | 'other';
export interface Integration {
  id?: number;
  idirUserid?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  realm?: string;
  publicAccess?: boolean;
  projectLead?: boolean;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  protocol?: string;
  authType?: string;
  serviceType?: string;
  apiServiceAccount?: boolean;
  environments?: string[];
  prNumber?: number;
  actionNumber?: number;
  hasUnreadNotifications?: boolean;
  browserFlowOverride?: string;
  additionalRoleAttribute?: string;
  usesTeam?: boolean;
  teamId?: number | string;
  userId?: number;
  team?: any;
  user?: any;
  devValidRedirectUris?: string[];
  testValidRedirectUris?: string[];
  prodValidRedirectUris?: string[];
  devIdps?: string[];
  testIdps?: string[];
  prodIdps?: string[];
  devRoles?: string[];
  testRoles?: string[];
  prodRoles?: string[];
  devLoginTitle?: string;
  testLoginTitle?: string;
  prodLoginTitle?: string;
  devAssertionLifespan?: number;
  devAccessTokenLifespan?: number;
  devSessionIdleTimeout?: number;
  devSessionMaxLifespan?: number;
  devOfflineSessionIdleTimeout?: number;
  devOfflineSessionMaxLifespan?: number;
  testAssertionLifespan?: number;
  testAccessTokenLifespan?: number;
  testSessionIdleTimeout?: number;
  testSessionMaxLifespan?: number;
  testOfflineSessionIdleTimeout?: number;
  testOfflineSessionMaxLifespan?: number;
  prodAssertionLifespan?: number;
  prodAccessTokenLifespan?: number;
  prodSessionIdleTimeout?: number;
  prodSessionMaxLifespan?: number;
  prodOfflineSessionIdleTimeout?: number;
  prodOfflineSessionMaxLifespan?: number;
  primaryEndUsers?: PrimaryEndUser[];
  primaryEndUsersOther?: string;
  lastChanges?: any[] | null;
  idirUserDisplayName?: string;
  requester?: string;
  status?: Status;
  bceidApproved?: boolean;
  githubApproved?: boolean;
  digitalCredentialApproved?: boolean;
  bcServicesCardApproved?: boolean;
  archived?: boolean;
  provisioned?: boolean;
  provisionedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  userTeamRole?: string;
  devDisplayHeaderTitle?: boolean;
  testDisplayHeaderTitle?: boolean;
  prodDisplayHeaderTitle?: boolean;
  devSamlLogoutPostBindingUri?: string;
  testSamlLogoutPostBindingUri?: string;
  prodSamlLogoutPostBindingUri?: string;
  devSamlSignAssertions?: boolean;
  testSamlSignAssertions?: boolean;
  prodSamlSignAssertions?: boolean;
  devOfflineAccessEnabled?: boolean;
  testOfflineAccessEnabled?: boolean;
  prodOfflineAccessEnabled?: boolean;
  devHomePageUri?: string;
  testHomePageUri?: string;
  prodHomePageUri?: string;
  bcscPrivacyZone?: string;
  bcscAttributes?: string[];
  isAdmin?: boolean;
  confirmSocial?: boolean;
  socialApproved?: boolean;
}

export interface Option {
  value: string | string[];
  label: string;
}

export interface SilverIDPOption {
  idir: string | string[];
  bceid: string | string[];
}
export interface GoldIDPOption {
  idir: string | string[];
  bceid: string | string[];
  github: string | string[];
  digitalCredential: string | string[];
  bcservicescard: string | string[];
  social: string | string[];
}

export interface ClientRole {
  name: string;
  composites: string[];
}

export interface EventCountMetric {
  event: string;
  count: number;
}
