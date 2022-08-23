import { Session } from '@lambda-shared/interfaces';

export const checkRole = (roles: string[], role: string) => roles.includes(role);
export const assertSessionRole = (session: Session, role: string) => {
  const hasRole = checkRole(session.client_roles, role);
  if (!hasRole) throw Error('permission denied');
};
