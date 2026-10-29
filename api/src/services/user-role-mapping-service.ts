import { IntegrationService } from './integration-service';
import { container, inject, injectable } from 'tsyringe';
import { ListUserRoleMappingQuery, Role, RolePayload, User, UserRoleMappingPayload } from '../types';
import { RoleService, assertRolesExist } from '@/services/role-service';
import createHttpError from 'http-errors';
import { updateUserProps } from '@/helpers/users';
import { updateRoleProps } from '@/helpers/roles';
import { listOfrolesValidator } from '@/schemas/role';
import { parseErrors } from '@/utils';
import { KeycloakServiceFactory } from './keycloak-service';
import { BceidWebserviceService, BCEID_SOAP_IDPS, BceidSoapIdp, BceidAccount } from '@/services/bceid-webservice';
import { MsGraphService, AzureIdirAccount } from '@/services/ms-graph-idir';
import { AuthContext } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@sso/authz';
import { audit } from '@/utils';
import { Environment, roleMappingOperations } from '@sso/audit';

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
    });
    return await this.usersByRole(int, environment, roleName, first, max);
  }

  public async getAllRolesByUser(authz: AuthContext, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
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
    });
    let users: User[];
    let roles: Role[];

    const { username, roleName, operation } = userRoleMapping;

    if (!['add', 'del'].includes(operation))
      throw new createHttpError[400](`invalid operation #${operation}. valid values are (add, del)`);

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    // Validation runs before anything is recorded: a 404 here stays in the request log.
    if (roleName) await assertRolesExist(keycloakService, int.clientId, [roleName]);
    if (username) users = (await keycloakService.getUser(username)) as User[];
    if (operation === 'del') {
      const roleUsers = await this.usersByRole(int, environment, roleName);
      if (roleUsers.length === 0) throw new createHttpError[404]('no user role mappings found');
    }

    roles = await this.applyRoleMappingChanges(int, environment, username, {
      add: operation === 'add' ? [roleName] : [],
      remove: operation === 'del' ? [roleName] : [],
    });

    return {
      users: updateUserProps(users),
      roles: updateRoleProps(roles),
    };
  }

  /**
   * Grants and revokes the given roles, one audited operation per actual change (under a `role-bulk-update`
   * parent when there is more than one), built exactly as the app builds them. Adding a role the user
   * already holds, or removing one they do not, changes nothing and is not recorded. Throws the first
   * failure once every change has been attempted; otherwise returns the user's roles afterwards.
   */
  private async applyRoleMappingChanges(
    int: any,
    environment: string,
    username: string,
    { add = [], remove = [] }: { add?: string[]; remove?: string[] },
  ): Promise<Role[]> {
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const current = ((await keycloakService.listClientUserRoleMappings(int.clientId, username)) as Role[]).map(
      (role) => role.name,
    );
    const { parent, changes } = roleMappingOperations({
      requestId: int.id,
      environment: environment as Environment,
      clientId: int.clientId,
      username,
      add: add.filter((roleName) => !current.includes(roleName)),
      remove: remove.filter((roleName) => current.includes(roleName)),
    });

    const results = await audit.runAuditedBatch(
      parent,
      changes.map(({ roleName, mode, operation }) => ({
        operation,
        call: () =>
          mode === 'add'
            ? keycloakService.addClientUserRoleMapping(int.clientId, username, [{ name: roleName }])
            : keycloakService.deleteClientUserRoleMapping(int.clientId, username, roleName),
      })),
    );
    const rejected = results.find((result) => result.status === 'rejected');
    if (rejected?.status === 'rejected') throw rejected.reason;

    return keycloakService.listClientUserRoleMappings(int.clientId, username);
  }

  public async listRolesByUsername(authz: AuthContext, integrationId: number, environment: string, username: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.USER_ROLE_MAPPINGS,
      action: ACTIONS.READ,
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
    });
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    for (let role of roles) {
      this.roleService.validateRole(role);
    }
    const roleNames = roles.map(({ name }) => name);
    await assertRolesExist(keycloakService, int.clientId, roleNames);

    return {
      data: updateRoleProps(await this.applyRoleMappingChanges(int, environment, parsedUsername, { add: roleNames })),
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
    });
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    for (let role of roles) {
      this.roleService.validateRole(role);
    }

    const roleNames = roles.map(({ name }) => name);
    await assertRolesExist(keycloakService, int.clientId, roleNames);

    // Importing the user is a precondition of the grant, not part of it: it runs first, unaudited, and a
    // user who cannot be verified upstream is rejected before any role change is recorded.
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
    }

    const data = updateRoleProps(
      await this.applyRoleMappingChanges(int, environment, parsedUsername, { add: roleNames }),
    );
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
    });
    const parsedUsername = this.parseUsername(int.clientId, username);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    await assertRolesExist(keycloakService, int.clientId, [roleName]);
    await this.applyRoleMappingChanges(int, environment, parsedUsername, { remove: [roleName] });
  }
}
