import type { Environment } from './types';

export interface Request {
  realm: string;
  devValidRedirectUris: string[];
  testValidRedirectUris: string[];
  prodValidRedirectUris: string[];
  devRoles: string[];
  testRoles: string[];
  prodRoles: string[];
  projectName: string;
  projectLead?: boolean;
  id?: number;
  newToSso?: boolean;
  status?: string;
  agreeWithTerms?: boolean;
  prNumber?: number;
  environments?: string[];
  createdAt?: string;
  publicAccess?: boolean;
}

export interface EnvironmentOption {
  name: Environment;
  display: string;
  idps: string[];
}

export interface ErrorMessages {
  agreeWithTerms: string;
  realm: string;
  redirectUris: string;
  publicAccess: string;
  newToSso: string;
  projectName: string;
  [any: string]: string;
}

export interface BceidEmailDetails {
  bceidTo?: string;
  bceidCc?: string;
  bceidBody?: string;
}
