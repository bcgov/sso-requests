export interface Team {
  name: string;
}

export interface User {
  email: string;
  role: 'admin' | 'user' | '';
  id: string;
}
