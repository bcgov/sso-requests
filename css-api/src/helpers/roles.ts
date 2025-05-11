import { Role } from '../types';

export const updateRoleProps = (roles: Role[]) => {
  return roles.map((role) => {
    return getAllowedRoleProps(role);
  });
};

export const getAllowedRoleProps = (role: Role) => {
  if (role) {
    return {
      name: role.name,
      composite: role.composite,
    };
  }
};
