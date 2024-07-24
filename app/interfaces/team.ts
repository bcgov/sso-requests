export interface Team {
  name: string;
  id: number;
  integrationCount?: string;
  role?: string;
  serviceAccountCount?: string;
}

export interface UserSurveyInformation {
  addUserToRole: boolean;
  createRole: boolean;
  cssApiRequest: boolean;
  createIntegration: boolean;
  viewMetrics: boolean;
  downloadLogs: boolean;
}

export interface User {
  id?: number;
  idirUserid?: string;
  idirEmail: string;
  additionalEmail?: string;
  role: 'admin' | 'member' | '';
  status?: string;
  pending?: boolean;
  createdAt?: string;
  updatedAt?: string;
  integrations?: any[];
  hasReadGoldNotification?: boolean;
  surveySubmissions?: UserSurveyInformation;
}

export interface LoggedInUser {
  email?: string;
  client_roles?: string[];
  roles?: string[];
  given_name?: string;
  family_name?: string;
  isAdmin?: boolean;
}

export interface KeycloakUser {
  email: string;
  firstName?: string;
  lastName?: string;
  username: string;
  attributes: any;
}
