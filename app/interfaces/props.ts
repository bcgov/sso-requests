import { MouseEventHandler } from 'react';

export interface UserSession {
  email: string;
  isAdmin: boolean;
  client_roles: string[];
}

export interface PageProps {
  session: UserSession;
  onLoginClick: MouseEventHandler<HTMLButtonElement>;
  onLogoutClick: MouseEventHandler<HTMLButtonElement>;
}
