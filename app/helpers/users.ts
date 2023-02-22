import { User } from '@app/interfaces/team';
import { KeycloakUser } from '@app/services/keycloak';

export const checkIfUserIsServiceAccount = (username: string) => {
  return username.startsWith('service-account-');
};

export const getServiceAccountUsername = (clientId: string) => {
  return `service-account-${clientId}`;
};

export const filterServiceAccountUsers = (users: KeycloakUser[]) => {
  return users.filter((user) => user.username.startsWith('service-account-'));
};
