import type { Environment } from 'interfaces/types';

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

export interface FormErrors {
  firstPageErrors?: object[];
  secondPageErrors?: object[];
  thirdPageErrors?: object[];
  fourthPageErrors?: object[];
}

export interface EnvironmentOption {
  name: Environment;
  display: string;
}
