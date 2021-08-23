export interface Session {
  idir_userid: string;
  client_roles: string[];
}

export interface Data {
  realm?: string;
  projectName: string;
  preferredEmail: string;
  newToSso: boolean;
  projectLead: boolean;
  devRedirectUrls?: string[];
  testRedirectUrls?: string[];
  prodRedirectUrls?: string[];
  agreeWithTC?: boolean;
  publicAccess?: boolean;
  id?: number;
}

export interface FormattedData {
  realm?: string;
  environments: string[];
  projectName: string;
  validRedirectUris: {
    dev: string[];
    test: string[];
    prod: string[];
  };
  id?: number;
  projectLead: boolean;
  preferredEmail: string;
  newToSso: boolean;
  agreeWithTC?: boolean;
  publicAccess?: boolean;
}

export interface EmailOptions {
  from?: string;
  to: string;
  body: string;
  bodyType?: string;
  cc?: string[];
  bcc?: string[];
  delayTS?: number;
  encoding?: string;
  priority?: 'normal' | 'low' | 'high';
  subject?: string;
  tag?: string;
}
