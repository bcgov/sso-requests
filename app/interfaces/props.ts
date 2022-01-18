export interface UserSession {
  email: string;
}

export interface PageProps {
  currentUser: UserSession;
  onLoginClick: Function;
  onLogoutClick: Function;
}
