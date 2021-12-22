export interface Team {
  name: string;
}

export interface User {
  email: string;
  role: 'admin' | 'user' | '';
  id: string;
}

export interface LoggedInUser {
  email?: string;
  client_roles?: string[];
}
