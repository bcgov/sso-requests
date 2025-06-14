import axios, { AxiosError, AxiosInstance } from 'axios';
import { getKeycloakCredentials } from '@/utils';
import jwt from 'jsonwebtoken';
import { RolePayload } from '@/types';
import createHttpError from 'http-errors';
import { inject, singleton } from 'tsyringe';
import logger from '@/logger';

interface KeycloakTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
  'not-before-policy': number;
  session_state: string;
  scope: string;
}

interface UserQuery {
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class KeycloakService {
  private realm: string = 'standard';
  private httpClient: AxiosInstance;
  private environment: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshing: boolean = false;

  constructor() {}

  setEnvironment(environment: string) {
    this.environment = environment;
    const { keycloakUrl } = getKeycloakCredentials(environment);
    this.httpClient = axios.create({
      baseURL: `${keycloakUrl}`,
    });
    this.httpClient.interceptors.response.use(
      (response) => {
        return response;
      },
      (error: AxiosError) => {
        logger.error('keycloak request path: ', error?.request?.path);
        logger.error('keycloak request headers: ', error?.request?.headers);
        logger.error('keycloak response status: ', error?.response?.status);
        logger.error('keycloak response data: ', error?.response?.data);
        logger.error('keycloak response status message: ', error?.response?.statusText);
        throw error;
      },
    );
  }

  getEnvironment() {
    return this.environment;
  }

  isTokenValid(accessToken: string) {
    return (jwt.decode(accessToken) as any).exp > Date.now().valueOf() / 1000 + 30;
  }

  async getAccessToken() {
    if (this.accessToken && this.isTokenValid(this.accessToken)) {
      return this.accessToken;
    }
    if (
      this.accessToken &&
      !this.isTokenValid(this.accessToken) &&
      this.refreshToken &&
      this.isTokenValid(this.refreshToken)
    ) {
      // refreshing access token 30 seconds earlier
      if (this.refreshing) {
        return this.accessToken;
      }
      this.refreshing = true;
      const response = await this.httpClient.post<KeycloakTokenResponse>(
        '/auth/realms/master/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: 'admin-cli',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      this.refreshing = false;
      return this.accessToken;
    } else {
      const { keycloakUsername, keycloakPassword } = getKeycloakCredentials(this.environment);
      const response = await this.httpClient.post<KeycloakTokenResponse>(
        '/auth/realms/master/protocol/openid-connect/token',
        new URLSearchParams({
          grant_type: 'password',
          username: keycloakUsername,
          password: keycloakPassword,
          client_id: 'admin-cli',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      this.accessToken = response.data.access_token;
      this.refreshToken = response.data.refresh_token;
      return this.accessToken;
    }
  }

  async getClient(clientId: string) {
    const accessToken = await this.getAccessToken();
    const response = await this.httpClient.get(`/auth/admin/realms/${this.realm}/clients?clientId=${clientId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.length === 0) throw new createHttpError.NotFound(`client ${clientId} not found`);
    return response.data[0];
  }

  async getUser(username: string) {
    const accessToken = await this.getAccessToken();
    const response = await this.httpClient.get(`/auth/admin/realms/${this.realm}/users?username=${username}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (response.data.length === 0) throw new createHttpError.NotFound(`user ${username} not found`);
    return response.data[0];
  }

  async createClientRole(clientId: string, role: RolePayload) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    try {
      await this.httpClient.post(`/auth/admin/realms/${this.realm}/clients/${client?.id}/roles`, role, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
      return await this.getClientRole(clientId, role.name);
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 409) {
          throw new createHttpError.Conflict(`role ${role.name} already exists`);
        }
      }
    }
  }

  async deleteClientRole(clientId: string, roleName: string) {
    try {
      const accessToken = await this.getAccessToken();
      const client = await this.getClient(clientId);
      const encodedRoleName = encodeURIComponent(roleName);
      await this.httpClient.delete(`/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new createHttpError.NotFound(`role ${roleName} not found`);
        }
      }
    }
  }

  async getClientRole(clientId: string, roleName: string) {
    try {
      const accessToken = await this.getAccessToken();
      const client = await this.getClient(clientId);
      const encodedRoleName = encodeURIComponent(roleName);
      const response = await this.httpClient.get(
        `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new createHttpError.NotFound(`role ${roleName} not found`);
        }
      }
    }
  }

  async listClientRoles(clientId: string) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const response = await this.httpClient.get(
      `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles?max=5000`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }

  async updateClientRole(clientId: string, roleName: string, role: RolePayload) {
    try {
      const accessToken = await this.getAccessToken();
      const client = await this.getClient(clientId);
      const encodedRoleName = encodeURIComponent(roleName);
      await this.httpClient.put(
        `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}`,
        role,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return await this.getClientRole(clientId, role?.name);
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new createHttpError.NotFound(`role ${roleName} not found`);
        } else if (error.response.status === 409) {
          throw new createHttpError.Conflict(`role ${role?.name} already exists`);
        }
      }
    }
  }

  async createCompositeRole(clientId: string, roleName: string, compositeRoles: RolePayload[]) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const clientRoles = await this.listClientRoles(clientId);
    const clientRolesNames = clientRoles.map((role) => role.name);
    const rolesNames = compositeRoles.map((role) => role.name);
    const invalidRoles = rolesNames.filter((role) => !clientRolesNames.includes(role));
    if (!clientRolesNames.includes(roleName)) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    }
    if (invalidRoles.length > 0) {
      throw new createHttpError[404](`composite roles (${invalidRoles.join(', ')}) not found`);
    }
    const encodedRoleName = encodeURIComponent(roleName);
    await this.httpClient.post(
      `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}/composites`,
      clientRoles.filter((r) => compositeRoles.find((role) => role.name === r.name)),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return await this.getClientRole(clientId, roleName);
  }

  async deleteCompositeRole(clientId: string, roleName: string, compositeRoleName: string) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const clientRoles = await this.listClientRoles(clientId);
    const clientRolesNames = clientRoles.map((role) => role.name);

    if (!clientRolesNames.includes(roleName)) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    } else if (!clientRolesNames.includes(compositeRoleName)) {
      throw new createHttpError.NotFound(`composite role ${compositeRoleName} not found`);
    }
    const encodedRoleName = encodeURIComponent(roleName);
    await this.httpClient.delete(
      `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}/composites`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: clientRoles.filter((r) => r.name === compositeRoleName),
      },
    );
    return await this.getClientRole(clientId, roleName);
  }

  async getCompositeRoles(clientId: string, roleName: string, compositeRoleName?: string) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const clientRoles = await this.listClientRoles(clientId);
    const clientRolesNames = clientRoles.map((role) => role.name);

    if (!clientRolesNames.includes(roleName)) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    }
    if (compositeRoleName && !clientRolesNames.includes(compositeRoleName)) {
      throw new createHttpError.NotFound(`composite role ${compositeRoleName} not found`);
    }
    const encodedRoleName = encodeURIComponent(roleName);
    const response = await this.httpClient.get(
      `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}/composites`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    if (compositeRoleName) {
      const compositeRole = response.data.find((role) => role.name === compositeRoleName);
      if (!compositeRole) {
        throw new createHttpError.NotFound(`role ${compositeRoleName} not found`);
      }
      return compositeRole;
    }
    return response.data;
  }

  async listUsersByClientRole(clientId: string, roleName: string, first: number, max: number) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    try {
      const encodedRoleName = encodeURIComponent(roleName);
      const response = await this.httpClient.get(
        `/auth/admin/realms/${this.realm}/clients/${client?.id}/roles/${encodedRoleName}/users?first=${first}&max=${max}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        if (error.response.status === 404) {
          throw new createHttpError.NotFound(`role ${roleName} not found`);
        }
      }
    }
  }

  async listClientUserRoleMappings(clientId: string, username: string) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const user = await this.getUser(username);
    const response = await this.httpClient.get(
      `/auth/admin/realms/${this.realm}/users/${user?.id}/role-mappings/clients/${client?.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }

  async addClientUserRoleMapping(clientId: string, username: string, roles: RolePayload[]) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const user = await this.getUser(username);

    const clientRoles = await this.listClientRoles(clientId);
    const clientRolesNames = clientRoles.map((role) => role.name);
    const rolesNames = roles.map((role) => role.name);
    const invalidRoles = rolesNames.filter((role) => !clientRolesNames.includes(role));
    if (invalidRoles.length > 0) {
      throw new createHttpError[404](`roles (${invalidRoles.join(', ')}) not found`);
    }

    await this.httpClient.post(
      `/auth/admin/realms/${this.realm}/users/${user?.id}/role-mappings/clients/${client?.id}`,
      clientRoles.filter((r) => roles.find((role) => role.name === r.name)),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return await this.listClientUserRoleMappings(clientId, username);
  }

  async deleteClientUserRoleMapping(clientId: string, username: string, roleName: string) {
    const accessToken = await this.getAccessToken();
    const client = await this.getClient(clientId);
    const user = await this.getUser(username);
    const clientRoles = await this.listClientRoles(clientId);
    const clientRolesNames = clientRoles.map((role) => role.name);
    if (!clientRolesNames.includes(roleName)) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    }
    await this.httpClient.delete(
      `/auth/admin/realms/${this.realm}/users/${user?.id}/role-mappings/clients/${client?.id}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        data: [clientRoles.find((role) => role.name === roleName)],
      },
    );
  }

  async getUserCount(userQuery: UserQuery) {
    const accessToken = await this.getAccessToken();
    const queryParams = new URLSearchParams();

    if (userQuery.username) queryParams.append('username', userQuery.username);
    if (userQuery.firstName) queryParams.append('firstName', userQuery.firstName);
    if (userQuery.lastName) queryParams.append('lastName', userQuery.lastName);
    if (userQuery.email) queryParams.append('email', userQuery.email);

    return await this.httpClient.get(`/auth/admin/realms/${this.realm}/users/count?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async getUsers(userQuery: UserQuery) {
    const data = [];
    const accessToken = await this.getAccessToken();
    const queryParams = new URLSearchParams();

    if (userQuery.username) queryParams.append('username', userQuery.username);
    if (userQuery.firstName) queryParams.append('firstName', userQuery.firstName);
    if (userQuery.lastName) queryParams.append('lastName', userQuery.lastName);
    if (userQuery.email) queryParams.append('email', userQuery.email);

    const userCount = await this.getUserCount(userQuery);

    // fetch users in batches of 50
    for (let i = 0; i < Math.ceil(userCount.data / 50); i++) {
      queryParams.append('first', (i * 50).toString());
      queryParams.append('max', '50');
      const response = await this.httpClient.get(`/auth/admin/realms/${this.realm}/users?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (response.data.length === 0) break;
      data.push(...response.data);
    }
    return data;
  }

  async getUserRealmRoles(username: string) {
    const accessToken = await this.getAccessToken();
    const user = await this.getUser(username);
    const response = await this.httpClient.get(
      `/auth/admin/realms/${this.realm}/users/${user?.id}/role-mappings/realm`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
    return response.data;
  }
}

@singleton()
export class KeycloakServiceFactory {
  constructor(
    @inject('DevKeycloakService') private devKeycloakService: KeycloakService,
    @inject('TestKeycloakService') private testKeycloakService: KeycloakService,
    @inject('ProdKeycloakService') private prodKeycloakService: KeycloakService,
  ) {}
  getKeycloakService(environment: string) {
    switch (environment) {
      case 'dev':
        this.devKeycloakService.setEnvironment('dev');
        return this.devKeycloakService;
      case 'test':
        this.testKeycloakService.setEnvironment('test');
        return this.testKeycloakService;
      case 'prod':
        this.prodKeycloakService.setEnvironment('prod');
        return this.prodKeycloakService;
      default:
        throw new createHttpError[404](`environment ${environment} not found`);
    }
  }
}
