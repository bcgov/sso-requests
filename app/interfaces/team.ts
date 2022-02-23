export interface Team {
  name: string;
  id: number;
  integrationCount?: string;
}

export interface User {
  idirEmail: string;
  role: 'admin' | 'member' | '';
  id?: number;
  status?: string;
  pending?: boolean;
  createdAt?: string;
}

export interface LoggedInUser {
  email?: string;
  client_roles?: string[];
  roles?: string[];
  isAdmin?: boolean;
}
