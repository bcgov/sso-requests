import type { Status } from './types';
export interface ServerRequest {
  agreeWithTerms?: boolean;
  id?: number;
  idirUserid?: string;
  projectName?: string;
  realm?: string;
  validRedirectUris?: {
    dev?: string[];
    test?: string[];
    prod?: string[];
  };
  prNumber?: number;
  projectLead?: boolean;
  environments?: string[];
  newToSso?: boolean;
  createdAt?: string;
  updatedAt?: string;
  status?: Status;
  publicAccess?: boolean;
}

export interface ClientRequest {
  realm?: string;
  devRedirectUrls?: string[];
  testRedirectUrls?: string[];
  prodRedirectUrls?: string[];
  projectName?: string;
  preferredEmail?: string;
  projectLead?: boolean;
  id?: number;
  newToSso?: boolean;
  status?: Status;
  agreeWithTerms?: boolean;
  prNumber?: number;
  environments?: string[];
  createdAt?: string;
  publicAccess?: boolean;
}
