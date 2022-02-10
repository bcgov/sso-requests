export interface Team {
  name: string;
  id: number;
}

export interface User {
  idirEmail: string;
  role: 'admin' | 'member' | '';
  id?: string;
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
