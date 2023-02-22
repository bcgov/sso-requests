import { KeycloakUser } from '@app/interfaces/team';

export const checkIfUserIsServiceAccount = (username: string) => {
  return username.startsWith('service-account-');
};

export const getServiceAccountUsername = (clientId: string) => {
  return `service-account-${clientId}`;
};

export const filterServiceAccountUsers = (users: KeycloakUser[]) => {
  return users.filter((user: KeycloakUser) => user.username.startsWith('service-account-'));
};
