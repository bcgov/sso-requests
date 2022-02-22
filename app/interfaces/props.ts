export interface UserSession {
  email: string;
  isAdmin: boolean;
}

export interface PageProps {
  currentUser: UserSession;
  onLoginClick: Function;
  onLogoutClick: Function;
}
