export type UserRoleMappingPayload = {
  roleName: string;
  username: string;
  operation: 'add' | 'del';
};

export type RolePayload = {
  name: string;
};

export type ListUserRoleMappingQuery = {
  roleName: string;
  username: string;
};

export type User = {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  attributes: Record<string, any>;
};

export type Role = {
  name: string;
  composite: boolean;
};
