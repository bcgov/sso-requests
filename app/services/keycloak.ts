import { instance } from './axios';

export const getInstallation = async (requestId: number, environment: string) => {
  try {
    const result = await instance.post('installation', { requestId, environment }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const changeClientSecret = async (
  requestId: number | undefined,
  environment: string | null,
): Promise<(string | null)[]> => {
  try {
    const result = await instance.put('installation', { requestId, environment }).then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export interface KeycloakUser {
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  attributes: any;
}

export const searchKeycloakUsers = async ({
  environment,
  idp,
  property,
  searchKey,
}: {
  environment: string;
  idp: string;
  property: string;
  searchKey: string;
}): Promise<(KeycloakUser[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/users', { environment, idp, property, searchKey })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const listClientRoles = async ({
  environment,
  integrationId,
  search = '',
  first = 0,
  max = 50,
}: {
  environment: string;
  integrationId: number;
  search?: string;
  first?: number;
  max?: number;
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/roles', { environment, integrationId, search, first, max })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const findClientRole = async ({
  environment,
  integrationId,
  roleName,
}: {
  environment: string;
  integrationId: number;
  roleName: string;
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/role', { environment, integrationId, roleName })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const listUserRoles = async ({
  environment,
  integrationId,
  username,
  first = 0,
  max = 50,
}: {
  environment: string;
  integrationId: number;
  username: string;
  first?: number;
  max?: number;
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/user-roles', { environment, integrationId, username, first, max })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const manageUserRole = async ({
  environment,
  integrationId,
  username,
  roleName,
  mode,
}: {
  environment: string;
  integrationId: number;
  username: string;
  roleName: string;
  mode: 'add' | 'del';
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .put('keycloak/user-roles', { environment, integrationId, username, roleName, mode })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const listRoleUsers = async ({
  environment,
  integrationId,
  roleName,
  first = 0,
  max = 50,
}: {
  environment: string;
  integrationId: number;
  roleName: string;
  first?: number;
  max?: number;
}): Promise<(KeycloakUser[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/role-users', { environment, integrationId, roleName, first, max })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const createRole = async ({
  environment,
  integrationId,
  roleName,
}: {
  environment: string;
  integrationId: number;
  roleName: string;
}): Promise<(any | null)[]> => {
  try {
    const result = await instance
      .post(`keycloak/roles`, { environment, integrationId, roleName })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

interface NewRole {
  name: string;
  envs: string[];
}

export const bulkCreateRole = async ({
  integrationId,
  roles,
}: {
  integrationId: number;
  roles: NewRole[];
}): Promise<(any | null)[]> => {
  try {
    const result = await instance.post(`keycloak/bulk-roles`, { integrationId, roles }).then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const deleteRole = async ({
  environment,
  integrationId,
  roleName,
}: {
  environment: string;
  integrationId: number;
  roleName: string;
}): Promise<(any | null)[]> => {
  try {
    const result = await instance
      .post(`keycloak/delete-role`, { environment, integrationId, roleName })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};
