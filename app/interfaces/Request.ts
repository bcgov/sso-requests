import type { Status } from './types';
export interface Request {
  id?: number;
  idirUserid?: string;
  projectName?: string;
  clientId?: string;
  clientName?: string;
  realm?: string;
  publicAccess?: boolean;
  authType?: string;
  devValidRedirectUris?: string[];
  testValidRedirectUris?: string[];
  prodValidRedirectUris?: string[];
  environments?: string[];
  prNumber?: number;
  actionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  projectLead?: boolean;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  status?: Status;
  archived?: boolean;
  hasUnreadNotifications?: boolean;
  usesTeam?: boolean;
  bceidApproved?: boolean;
  teamId?: number | string;
  userId?: number;
  team?: any;
  serviceType?: string;
  devIdps?: string[];
  testIdps?: string[];
  prodIdps?: string[];
  devRoles?: string[];
  testRoles?: string[];
  prodRoles?: string[];
  devLoginTitle?: string;
  testLoginTitle?: string;
  prodLoginTitle?: string;
}

export interface Option {
  value: string | string[];
  label: string;
}
