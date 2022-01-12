export interface Team {
  name: string;
  id: number;
}

export interface User {
  idirEmail: string;
  role: 'admin' | 'user' | '';
  id?: string;
  status?: string;
  pending?: boolean;
}

export interface LoggedInUser {
  email?: string;
  client_roles?: string[];
}
