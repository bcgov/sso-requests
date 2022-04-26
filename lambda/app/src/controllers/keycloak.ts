import { Session, User } from '../../../shared/interfaces';
import { searchUsers } from '../keycloak/users';

export const searchKeycloakUsers = async (session: Session, data: any) => {
  const installation = await searchUsers(data);

  return installation;
};
