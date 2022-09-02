import type { Environment } from './types';

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
