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
import { AuthContext } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@/constants';

/** IDPs supported for the auto-provisioning ("roles-new") flow, and how each is verified. */
const AUTO_PROVISION_IDPS = [...BCEID_SOAP_IDPS, 'azureidir'] as const;
type AutoProvisionIdp = typeof AUTO_PROVISION_IDPS[number];

/**
 * IDPs that support direct role assignment on the "roles-new" route but not auto-provisioning,
 * since there's no upstream service available to verify a GUID exists before creating the user.
 * For these, the route behaves like the older addRoleToUser route: it assigns the role if the user
 * already exists in Keycloak, and 404s if they don't.
 */
const ROLE_ONLY_IDPS = ['githubbcgov', 'githubpublic'] as const;

/**
 * The GUID portion of a `<guid>@<idp>` username is interpolated unescaped into upstream requests
 * (a SOAP XML body for BCeID IDPs, and an OData filter string for azureidir). Only allow the
 * standard hex UUID character set so it can never be used to inject markup/filter syntax.
 */
const GUID_PATTERN = /^[0-9a-fA-F]{32}$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

  private async usersByRole(int: any, environment: string, roleName: string, first?: number, max?: number) {
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    return await keycloakService.listUsersByClientRole(int?.clientId, roleName, first, max);
  }

  private async rolesByUser(int: any, environment: string, username: string) {
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    return await keycloakService.listClientUserRoleMappings(int.clientId, parsedUsername);
  }

  public async getAllByQuery(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    query: ListUserRoleMappingQuery,
  ) {
    let users = [];
    let roles = [];

    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
      environment,
    });

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
      users = await this.usersByRole(int, environment, query.roleName);
      roles = users.length > 0 ? [roles.find((role) => role.name === query?.roleName)] : [];
    } else if (query?.username && !query?.roleName) {
      roles = await this.rolesByUser(int, environment, query.username);
      roles = updateRoleProps(roles as Role[]);
      users = roles.length > 0 ? await keycloakService.getUser(query.username) : [];
    } else if (query?.roleName && query?.username) {
      roles = await this.rolesByUser(int, environment, query.username);
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
    authz: AuthContext,
    integrationId: number,
    environment: string,
    roleName: string,
    first?: number,
    max?: number,
  ) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
      environment,
    });
    return await this.usersByRole(int, environment, roleName, first, max);
  }

  public async getAllRolesByUser(authz: AuthContext, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
      environment,
    });
    return await this.rolesByUser(int, environment, username);
  }

  public async manageRoleMapping(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    userRoleMapping: UserRoleMappingPayload,
  ) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.WRITE,
      environment,
    });
    let users: User[];
    let roles: Role[];

    const { username, roleName, operation } = userRoleMapping;

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    if (roleName) {
      roles = updateRoleProps(await keycloakService.listClientRoles(int.clientId));
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
      const users = await this.usersByRole(int, environment, roleName);
      if (users.length === 0) throw new createHttpError[404]('no user role mappings found');
    }
    roles = (await this.manageUserRole(int, { environment, username, roleName, mode: operation })) as Role[];

    return {
      users: updateUserProps(users),
      roles: updateRoleProps(roles),
    };
  }

  public async listRolesByUsername(authz: AuthContext, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
      environment,
    });
    return { data: updateRoleProps(await this.rolesByUser(int, environment, username)) };
  }

  public async listUsersByRolename(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    roleName: string,
    page: number = 1,
    max: number = 50,
  ) {
    const first = page > 1 ? max * (page - 1) : 0;
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
      environment,
    });
    const userList = await this.usersByRole(int, environment, roleName, first, max);
    return { page, data: updateUserProps(userList as User[]) };
  }

  public async addRoleToUser(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(roles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.WRITE,
      environment,
    });
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
   * Same as addRoleToUser, but if the user does not yet exist in the standard realm and their idp
   * supports auto-provisioning (see AUTO_PROVISION_IDPS), attempts to verify their GUID against the
   * upstream identity provider (parsed from the `<guid>@<idp>` username) and, if verified, imports
   * the user into Keycloak before assigning the role. IDPs that aren't auto-provisionable (e.g.
   * githubpublic/githubbcgov, which have no upstream GUID-verification service) skip provisioning
   * entirely and fall through to addClientUserRoleMapping, which 404s if the user isn't found -
   * matching the behavior of the older addRoleToUser route.
   */
  public async addRoleToUserWithProvisioning(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(roles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.WRITE,
      environment,
    });
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    for (let role of roles) {
      this.roleService.validateRole(role);
    }

    const isServiceAccount = parsedUsername.startsWith('service-account-');

    if (!isServiceAccount) {
      const parts = parsedUsername.split('@');
      if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new createHttpError.BadRequest(`invalid username ${parsedUsername}`);
      }
      const [, idp] = parts;

      if (AUTO_PROVISION_IDPS.includes(idp as AutoProvisionIdp)) {
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
      } else if (!(ROLE_ONLY_IDPS as readonly string[]).includes(idp)) {
        throw new createHttpError.BadRequest(`invalid idp ${idp}`);
      }
      // else: idp is in ROLE_ONLY_IDPS (e.g. github) - skip provisioning; addClientUserRoleMapping
      // below will look the user up itself and 404 if they don't already exist in Keycloak.
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

    if (!GUID_PATTERN.test(guid)) {
      throw new createHttpError.BadRequest(`invalid username ${username}`);
    }

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
    authz: AuthContext,
    integrationId: number,
    environment: string,
    username: string,
    roleName: string,
  ) {
    this.roleService.validateRole({ name: roleName });
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.WRITE,
      environment,
    });
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
