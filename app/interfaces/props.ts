interface User {
  email: string;
}

export interface IndexPageProps {
  currentUser: User;
  setCurrentUser: Function;
}

export interface RequestPageProps {
  currentUser: User;
}
