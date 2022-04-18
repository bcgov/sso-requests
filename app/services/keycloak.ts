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
}: {
  environment: string;
  integrationId: number;
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance.post('keycloak/roles', { environment, integrationId }).then((res) => res.data);
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
}: {
  environment: string;
  integrationId: number;
  username: string;
}): Promise<(string[] | null)[]> => {
  try {
    const result = await instance
      .post('keycloak/user-roles', { environment, integrationId, username })
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
