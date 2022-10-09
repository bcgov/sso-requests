export const updateRoleProps = (roles: any) => {
  return roles.map((role) => {
    return getAllowedRoleProps(role);
  });
};

export const getAllowedRoleProps = (role: any) => {
  return {
    name: role.name,
    composite: role.composite,
  };
};
