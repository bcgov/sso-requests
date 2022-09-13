import type { Status } from './types';
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
  serviceAccountEnabled?: boolean;
  apiServiceAccount?: boolean;
  environments?: string[];
  prNumber?: number;
  actionNumber?: number;
  hasUnreadNotifications?: boolean;
  browserFlowOverride?: string;
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
  lastChanges?: any[] | null;
  idirUserDisplayName?: string;
  requester?: string;
  status?: Status;
  bceidApproved?: boolean;
  githubApproved?: boolean;
  archived?: boolean;
  provisioned?: boolean;
  provisionedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  userTeamRole?: string;
}

export interface Option {
  value: string | string[];
  label: string;
}

export interface ClientRole {
  name: string;
  composites: string[];
}
