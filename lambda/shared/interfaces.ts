export interface Session {
  idir_userid: string;
  email?: string;
  client_roles: string[];
  given_name: string;
  family_name: string;
}

export interface User {
  id: string;
  idirUserid: string;
  idirEmail: string;
}

export interface Data {
  realm?: string;
  projectName: string;
  preferredEmail: string;
  projectLead: boolean;
  devValidRedirectUris?: string[];
  testValidRedirectUris?: string[];
  prodValidRedirectUris?: string[];
  agreeWithTC?: boolean;
  publicAccess?: boolean;
  id?: number;
  comment?: string;
  additionalEmails: string[];
  bceidEmailDetails?: object;
  environments?: string[];
  idirUserDisplayName?: string;
  idirUserId?: string;
  clientName?: string;
  newToSso?: boolean;
  agreeWithTerms?: boolean;
  status?: string;
  archived?: boolean;
  usesTeam?: boolean;
  team?: number;
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
  agreeWithTC?: boolean;
  publicAccess?: boolean;
}

interface EmailEvent {
  emailCode: string;
  requestId?: number;
}

export interface EmailOptions {
  from?: string;
  to: string[];
  body: string;
  bodyType?: string;
  cc?: string[];
  bcc?: string[];
  delayTS?: number;
  encoding?: string;
  priority?: 'normal' | 'low' | 'high';
  subject?: string;
  tag?: string;
  event: EmailEvent;
}

export interface BceidEmailDetails {
  bceidTo?: string;
  bceidCc?: string;
  bceidBody?: string;
}
