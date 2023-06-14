import { instance } from './axios';
import { ClientRole } from 'interfaces/Request';
import { KeycloakUser } from 'interfaces/team';

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

interface RowsAndCount {
  count: number;
  rows: KeycloakUser[];
}

export const searchKeycloakUsers = async ({
  environment,
  idp,
  property,
  searchKey,
  integrationId,
}: {
  environment: string;
  idp: string;
  property: string;
  searchKey: string;
  integrationId: number;
}): Promise<[RowsAndCount, null] | [null, Error]> => {
  try {
    const result: RowsAndCount = await instance
      .post('keycloak/users', { environment, idp, property, searchKey, integrationId })
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
}: {
  environment: string;
  integrationId: number;
  search?: string;
  first?: number;
  max?: number;
}): Promise<any[]> => {
  try {
    const result = await instance
      .post('keycloak/roles', { environment, integrationId, search })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const listComposites = async ({
  environment,
  integrationId,
  search = '',
}: {
  environment: string;
  integrationId: number;
  search?: string;
  first?: number;
  max?: number;
}): Promise<any[]> => {
  try {
    const result = await instance
      .post('keycloak/composites', { environment, integrationId, search })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const setCompositeClientRoles = async ({
  environment,
  integrationId,
  roleName,
  compositeRoleNames,
}: {
  environment: string;
  integrationId: number;
  roleName: string;
  compositeRoleNames: string[];
}): Promise<(ClientRole | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/set-composite-roles', { environment, integrationId, roleName, compositeRoleNames })
      .then((res) => res.data);
    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const getCompositeClientRoles = async ({
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
      .post('keycloak/get-composite-roles', { environment, integrationId, roleName })
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
      .put('keycloak/user-role', { environment, integrationId, username, roleName, mode })
      .then((res) => res.data);

    return [result, null];
  } catch (err: any) {
    console.error(err);
    return [null, err];
  }
};

export const manageUserRoles = async ({
  environment,
  integrationId,
  username,
  roleNames,
}: {
  environment: string;
  integrationId: number;
  username: string;
  roleNames: string[];
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .put('keycloak/user-roles', { environment, integrationId, username, roleNames })
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
