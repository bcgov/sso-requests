import type { Environment } from './types';

export interface Request {
  realm: string;
  devValidRedirectUris: string[];
  testValidRedirectUris: string[];
  prodValidRedirectUris: string[];
  projectName: string;
  preferredEmail?: string;
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
}

export interface ErrorMessages {
  agreeWithTerms: string;
  preferredEmail: string;
  realm: string;
  redirectUris: string;
  publicAccess: string;
  newToSso: string;
  projectName: string;
  [any: string]: string;
}

export interface SaveMessage {
  content: string;
  error: boolean;
}

export interface Stage {
  title: string;
  number: number;
}
