import Keycloak, { KeycloakTokenParsed } from 'keycloak-js';
import { User } from 'interfaces/team';

export interface AzureUser {
  mail: string;
  id: string;
}

export interface SessionContextInterface {
  session: KeycloakTokenParsed | null;
  user: User | null;
  keycloak: Keycloak;
}
