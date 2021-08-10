interface User {
  email: string;
}

export interface PageProps {
  currentUser: User;
  onLoginClick: Function;
  onLogoutClick: Function;
}
