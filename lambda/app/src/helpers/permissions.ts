import { Session } from '@lambda-shared/interfaces';
import createHttpError from 'http-errors';

export const checkRole = (roles: string[], role: string) => roles.includes(role);
export const assertSessionRole = (session: Session, role: string) => {
  const hasRole = checkRole(session.client_roles, role);
  if (!hasRole) throw new createHttpError.Forbidden(`user does not have ${role} role`);
};
