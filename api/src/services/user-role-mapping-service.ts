import { IntegrationService } from './integration-service';
import { container, inject, injectable } from 'tsyringe';
import { ListUserRoleMappingQuery, Role, RolePayload, User, UserRoleMappingPayload } from '../types';
import { RoleService } from '@/services/role-service';
import createHttpError from 'http-errors';
import { updateUserProps } from '@/helpers/users';
import { updateRoleProps } from '@/helpers/roles';
import { listOfrolesValidator } from '@/schemas/role';
import { parseErrors } from '@/utils';
import { KeycloakServiceFactory } from './keycloak-service';
import { BceidWebserviceService, BCEID_SOAP_IDPS, BceidSoapIdp, BceidAccount } from '@/services/bceid-webservice';
import { MsGraphService, AzureIdirAccount } from '@/services/ms-graph-idir';

/** IDPs supported for the auto-provisioning ("roles-new") flow, and how each is verified. */
const AUTO_PROVISION_IDPS = [...BCEID_SOAP_IDPS, 'azureidir'] as const;
type AutoProvisionIdp = typeof AUTO_PROVISION_IDPS[number];

@injectable()
export class UserRoleMappingService {
  keycloakServiceFactory = container.resolve(KeycloakServiceFactory);
  constructor(
    @inject('IntegrationService') private integrationService: IntegrationService,
    @inject('RoleService') private roleService: RoleService,
    @inject('BceidWebserviceService') private bceidWebserviceService: BceidWebserviceService,
    @inject('MsGraphService') private msGraphService: MsGraphService,
  ) {}

  /**
   * Check if the username is the client ID and return that client's service account username if it matches.
   * Internally keycloak creates a service account user with a name in the format service-account-<clientID>
   */
  private parseUsername(clientId, username) {
    let parsedUsername = username;
    if (clientId === username) {
      parsedUsername = `service-account-${clientId}`;
    }
    return parsedUsername;
  }

  public async getAllByQuery(
    teamId: number,
    integrationId: number,
    environment: string,
    query: ListUserRoleMappingQuery,
  ) {
    let users = [];
    let roles = [];

    const int = await this.integrationService.getById(integrationId, teamId);

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    if (query?.roleName) {
      roles = await keycloakService.listClientRoles(int.clientId);
      if (!roles.find((role) => role.name === query?.roleName))
        throw new createHttpError[404](`role ${query?.roleName} not found`);
    }

    if (query?.username) {
      users = await keycloakService.getUser(query.username);
      if (users.length === 0) throw new createHttpError[404](`user ${query?.username} not found`);
    }

    if (query?.roleName && !query?.username) {
      users = await this.getAllUsersByRole(teamId, integrationId, environment, query.roleName);
      roles = users.length > 0 ? [roles.find((role) => role.name === query?.roleName)] : [];
    } else if (query?.username && !query?.roleName) {
      roles = await this.getAllRolesByUser(teamId, integrationId, environment, query.username);
      roles = updateRoleProps(roles as Role[]);
      users = roles.length > 0 ? await keycloakService.getUser(query.username) : [];
    } else if (query?.roleName && query?.username) {
      roles = await this.getAllRolesByUser(teamId, integrationId, environment, query.username);
      if (!(roles.length > 0) || !roles.find((role) => role.name === query.roleName)) {
        users = [];
        roles = [];
      } else {
        roles = [roles.find((role) => role.name === query.roleName)];
      }
    }
    users = updateUserProps(users);
    roles = updateRoleProps(roles as Role[]);
    return { users, roles };
  }

  public async getAllUsersByRole(
    teamId: number,
    integrationId: number,
    environment: string,
    roleName: string,
    first?: number,
    max?: number,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    return await keycloakService.listUsersByClientRole(int?.clientId, roleName, first, max);
  }

  public async getAllRolesByUser(teamId: number, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    return await keycloakService.listClientUserRoleMappings(int.clientId, parsedUsername);
  }

  public async manageRoleMapping(
    teamId: number,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    let users: User[];
    let roles: Role[];

    const { username, roleName, operation } = userRoleMapping;

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    if (roleName) {
      roles = await this.roleService.getAllByEnvironment(teamId, integrationId, environment);
      const roleExists = roles.find((role: RolePayload) => role.name === roleName);
      if (!roleExists) throw new createHttpError[404](`role ${roleName} not found`);
    }

    if (username) {
      users = (await keycloakService.getUser(username)) as User[];
      if (users.length === 0) throw new createHttpError[404](`user ${username} not found`);
    }

    if (!['add', 'del'].includes(operation))
      throw new createHttpError[400](`invalid operation #${operation}. valid values are (add, del)`);

    if (operation === 'del') {
      const users = await this.getAllUsersByRole(teamId, integrationId, environment, roleName);
      if (users.length === 0) throw new createHttpError[404]('no user role mappings found');
    }
    roles = (await this.manageUserRole(int, { environment, username, roleName, mode: operation })) as Role[];

    return {
      users: updateUserProps(users),
      roles: updateRoleProps(roles),
    };
  }

  public async listRolesByUsername(teamId: number, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const parsedUsername = this.parseUsername(int.clientId, username);
    return { data: updateRoleProps(await keycloakService.listClientUserRoleMappings(int.clientId, parsedUsername)) };
  }

  public async listUsersByRolename(
    teamId: number,
    integrationId: number,
    environment: string,
    roleName: string,
    page: number = 1,
    max: number = 50,
  ) {
    const first = page > 1 ? max * (page - 1) : 0;
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const userList = await keycloakService.listUsersByClientRole(
      (
        await this.integrationService.getById(integrationId, teamId)
      ).clientId,
      roleName,
      first,
      max,
    );
    return { page, data: updateUserProps(userList as User[]) };
  }

  public async addRoleToUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(roles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    const int = await this.integrationService.getById(integrationId, teamId);
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    for (let role of roles) {
      this.roleService.validateRole(role);
    }

    return {
      data: updateRoleProps(await keycloakService.addClientUserRoleMapping(int.clientId, parsedUsername, roles)),
    };
  }

  /**
   * Same as addRoleToUser, but if the user does not yet exist in the standard realm, attempts to
   * verify their GUID against the upstream identity provider (parsed from the `<guid>@<idp>`
   * username) and, if verified, imports the user into Keycloak before assigning the role.
   */
  public async addRoleToUserWithProvisioning(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(roles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    const int = await this.integrationService.getById(integrationId, teamId);
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    for (let role of roles) {
      this.roleService.validateRole(role);
    }

    const isServiceAccount = parsedUsername.startsWith('service-account-');

    if (!isServiceAccount) {
      const userExists = await keycloakService
        .getUser(parsedUsername)
        .then(() => true)
        .catch((err) => {
          if (err instanceof createHttpError.NotFound) return false;
          throw err;
        });

      if (!userExists) {
        await this.provisionUpstreamUser(keycloakService, int, parsedUsername, environment);
      }
    }

    const added = await keycloakService.addClientUserRoleMapping(int.clientId, parsedUsername, roles);
    const data = updateRoleProps(added);
    return {
      data,
    };
  }

  /**
   * Parses the `<guid>@<idp>` username, verifies the GUID exists with the upstream identity
   * provider, and imports the user into Keycloak's standard realm for the given environment.
   * Throws a 400 if the username is malformed, the idp is not supported/enabled, or the upstream
   * provider has no matching account.
   */
  private async provisionUpstreamUser(keycloakService: any, integration: any, username: string, environment: string) {
    const parts = username.split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new createHttpError.BadRequest(`invalid username ${username}`);
    }
    const [guid, idp] = parts;

    if (!AUTO_PROVISION_IDPS.includes(idp as AutoProvisionIdp)) {
      throw new createHttpError.BadRequest(`invalid idp ${idp}`);
    }
    if (!integration.devIdps.includes(idp)) {
      throw new createHttpError.BadRequest(`invalid idp ${idp}`);
    }

    const isBceidSoapIdp = (BCEID_SOAP_IDPS as readonly string[]).includes(idp);
    const account: BceidAccount | AzureIdirAccount = isBceidSoapIdp
      ? await this.bceidWebserviceService.verifyAccountByGuid(idp as BceidSoapIdp, guid, environment)
      : await this.msGraphService.verifyAzureIdirAccountByGuid(guid);

    if (!account) {
      throw new createHttpError.BadRequest(`could not verify user ${username} with the upstream identity provider`);
    }

    // Only the username is created here; profile data (email, name, etc.) varies by IDP and syncs
    // into Keycloak automatically on the user's first login.
    const lowGuid = guid.toLowerCase();
    await keycloakService.createUser({
      username: `${lowGuid}@${idp}`,
      idpAlias: idp,
      idpUserId: lowGuid,
    });
  }

  public async deleteRoleFromUser(
    teamId: number,
    integrationId: number,
    environment: string,
    username: string,
    roleName: string,
  ) {
    this.roleService.validateRole({ name: roleName });
    const int = await this.integrationService.getById(integrationId, teamId);
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    await keycloakService.deleteClientUserRoleMapping(int.clientId, parsedUsername, roleName);
  }

  public async manageUserRole(
    integration: any,
    {
      environment,
      username,
      roleName,
      mode,
    }: {
      environment: string;
      username: string;
      roleName: string;
      mode: 'add' | 'del';
    },
  ) {
    if (!username.startsWith('service-account-')) {
      const idp = username.split('@')[1];
      if (!integration.devIdps.includes(idp)) throw new createHttpError.BadRequest(`invalid idp ${idp}`);
    }

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    const client = await keycloakService.getClient(integration.clientId);

    const user = await keycloakService.getUser(username);

    if (!user) throw new createHttpError.NotFound(`user ${username} not found`);

    const role = await keycloakService.getClientRole(integration.clientId, roleName);
    if (!role) throw new createHttpError.NotFound(`role ${roleName} not found`);

    const roleMapping = {
      realm: 'standard',
      id: user.id,
      clientUniqueId: client.id,
    };

    const roleMappingUpdate = { ...roleMapping, roles: [{ id: role.id, name: role.name }] };

    if (mode === 'del') {
      roleMappingUpdate.roles.map(async (r) => {
        await keycloakService.deleteClientUserRoleMapping(client.id, user.username, r.name);
      });
    } else {
      roleMappingUpdate.roles.map(async (r) => {
        await keycloakService.addClientUserRoleMapping(client.id, user.username, r.name);
      });
    }

    const roles = await keycloakService.listClientUserRoleMappings(client.id, user.username);
    return roles;
  }
}
