import type { Status } from './types';
export interface Request {
  id?: number;
  idirUserid?: string;
  projectName?: string;
  clientName?: string;
  realm?: string;
  publicAccess?: boolean;
  devValidRedirectUris: string[];
  testValidRedirectUris: string[];
  prodValidRedirectUris: string[];
  environments: string[];
  prNumber?: number;
  actionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
  projectLead?: boolean;
  preferredEmail?: string;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  status?: Status;
  archived: boolean;
  additionalEmails: string[];
  hasUnreadNotifications?: boolean;
}
