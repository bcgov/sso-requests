export interface UserSession {
  email: string;
  isAdmin: boolean;
}

export interface PageProps {
  session: UserSession;
  onLoginClick: Function;
  onLogoutClick: Function;
}
