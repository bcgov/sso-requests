export interface User {
  id: number;
  idirUserid: string;
  idirEmail: string;
  displayName: string;
  additionalEmail: string;
  isAdmin?: boolean;
}
export interface Session {
  idir_userid: string;
  email?: string;
  client_roles: string[];
  given_name: string;
  family_name: string;
  user?: User;
  bearerToken?: string;
}

export interface Data {
  realm?: string;
  projectName: string;
  projectLead: boolean;
  devValidRedirectUris?: string[];
  testValidRedirectUris?: string[];
  prodValidRedirectUris?: string[];
  agreeWithTC?: boolean;
  publicAccess?: boolean;
  id?: number;
  comment?: string;
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
  teamId?: string;
  userId?: string;
  team?: Team;
  user?: User;
  requester?: string;
  serviceType?: string;
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
  agreeWithTC?: boolean;
  publicAccess?: boolean;
}

interface EmailEvent {
  emailCode: string;
  requestId?: number;
}

export interface EmailOptions {
  code?: string;
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
  event?: EmailEvent;
}

export interface BceidEmailDetails {
  bceidTo?: string;
  bceidCc?: string;
  bceidBody?: string;
}

export interface Member {
  email: string;
  role: 'admin' | 'user' | '';
  idirEmail?: string;
  id: number;
}

export interface Team {
  id: number;
  name: string;
  members: Member[];
}
