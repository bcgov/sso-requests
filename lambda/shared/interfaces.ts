import { Integration } from '@app/interfaces/Request';

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

export interface IntegrationData extends Integration {
  comment?: string;
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

export interface UserSurveyInformation {
  addUserToRole: boolean;
  createRole: boolean;
  cssApiRequest: boolean;
  createIntegration: boolean;
}

export type QUEUE_ACTION = 'create' | 'update' | 'delete';
export type Status = 'draft' | 'submitted' | 'pr' | 'prFailed' | 'planned' | 'planFailed' | 'applied' | 'applyFailed';
