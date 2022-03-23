export interface Team {
  name: string;
  id: number;
  integrationCount?: string;
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
}

export interface LoggedInUser {
  email?: string;
  client_roles?: string[];
  roles?: string[];
  given_name?: string;
  family_name?: string;
  isAdmin?: boolean;
}
