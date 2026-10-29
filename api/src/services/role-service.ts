import { container, inject, singleton } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { roleValidator, listOfrolesValidator } from '@/schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '@/helpers/roles';
import { Role, RolePayload } from '@/types';
import { AuthContext } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@sso/authz';
import { audit, parseErrors } from '@/utils';
import { KeycloakService, KeycloakServiceFactory } from './keycloak-service';
import models from '@/sequelize/models/models';
import { createCompositeRolesDB, deleteCompositeRolesDB, destroyRequestRole } from '@/sequelize/queries/requestRoles';
import { Environment, roleOperation } from '@sso/audit';

/** Whether the client has the role. Only a 404 means it does not; anything else is rethrown. */
const roleExists = async (keycloakService: KeycloakService, clientId: string, roleName: string) =>
  keycloakService.getClientRole(clientId, roleName).then(
    (role) => Boolean(role),
    (err) => {
      if (err instanceof createHttpError.NotFound) return false;
      throw err;
    },
  );

/**
 * The Keycloak service returns nothing, rather than throwing, for a role call that failed for any reason it
 * does not map to an HTTP error. Make that a failure, so it is never recorded or mirrored as a success.
 */
const confirmed = async <T>(call: Promise<T>, action: string): Promise<T> => {
  const result = await call;
  if (!result) throw new createHttpError.UnprocessableEntity(`failed to ${action}`);
  return result;
};

/** 404 unless the client has every one of the roles. */
export const assertRolesExist = async (keycloakService: KeycloakService, clientId: string, roleNames: string[]) => {
  const clientRoleNames = (await keycloakService.listClientRoles(clientId)).map((role: Role) => role.name);
  const missing = roleNames.filter((name) => !clientRoleNames.includes(name));
  if (missing.length === 1) throw new createHttpError.NotFound(`role ${missing[0]} not found`);
  if (missing.length > 1) throw new createHttpError.NotFound(`roles (${missing.join(', ')}) not found`);
};

@singleton()
export class RoleService {
  keycloakServiceFactory = container.resolve(KeycloakServiceFactory);
  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getAllByEnvironment(authz: AuthContext, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.READ,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const intRoles = await KeycloakService.listClientRoles(int.clientId);
    return updateRoleProps(intRoles);
  }

  public async getByName(authz: AuthContext, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.READ,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const role = await KeycloakService.getClientRole(int.clientId, roleName);
    if (!role) throw new createHttpError[404](`role ${roleName} not found`);
    return getAllowedRoleProps(role as Role);
  }

  public async createRole(authz: AuthContext, integrationId: number, role: RolePayload, environment: string) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    if (await roleExists(KeycloakService, int.clientId, role.name)) {
      throw new createHttpError.Conflict(`role ${role.name} already exists`);
    }

    // The role row mirrors Keycloak, so it is written only once Keycloak has the role.
    const kcRole = await audit.runAuditedOperation(
      roleOperation('role-create', { requestId: int.id, environment: environment as Environment, roleName: role.name }),
      () => confirmed(KeycloakService.createClientRole(int.clientId, role), `create role ${role.name}`),
      {
        onSuccess: (transaction) =>
          models.requestRole.create({ name: role.name, environment, requestId: int.id }, { transaction }),
      },
    );
    return getAllowedRoleProps(kcRole);
  }

  public async deleteRole(authz: AuthContext, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    if (!(await roleExists(KeycloakService, int.clientId, roleName))) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    }

    await audit.runAuditedOperation(
      roleOperation('role-delete', { requestId: int.id, environment: environment as Environment, roleName }),
      () => KeycloakService.deleteClientRole(int.clientId, roleName),
      { onSuccess: (transaction) => destroyRequestRole(int.id, roleName, environment, transaction) },
    );
  }

  public async updateRole(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    role: RolePayload,
  ) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    if (!(await roleExists(KeycloakService, int.clientId, roleName))) {
      throw new createHttpError.NotFound(`role ${roleName} not found`);
    }
    const renamed = role.name !== roleName;
    if (renamed && (await roleExists(KeycloakService, int.clientId, role.name))) {
      throw new createHttpError.Conflict(`role ${role.name} already exists`);
    }

    const updatedRole = await audit.runAuditedOperation(
      roleOperation(
        'role-update',
        { requestId: int.id, environment: environment as Environment, roleName },
        renamed ? { newRoleName: role.name } : {},
      ),
      () => confirmed(KeycloakService.updateClientRole(int.clientId, roleName, role), `update role ${roleName}`),
      {
        onSuccess: async (transaction) => {
          const dbRole = await models.requestRole.findOne({
            where: { name: roleName, environment, requestId: int.id },
            transaction,
          });
          // if role exists in db then update else create
          if (dbRole) {
            dbRole.name = role.name;
            await dbRole.save({ transaction });
          } else {
            await models.requestRole.create({ name: role.name, environment, requestId: int.id }, { transaction });
          }
        },
      },
    );
    return getAllowedRoleProps(updatedRole);
  }

  public validateRole(role: RolePayload) {
    const valid = roleValidator(role || {});
    if (!valid) throw new createHttpError[400](parseErrors(roleValidator.errors));
    const roleName = role.name.trim();
    if (roleName.length === 0) throw new createHttpError[400]('invalid role');
  }

  public async checkForExistingRole(integration: any, environment: string, roleName: string) {
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const existingRole = await KeycloakService.getClientRole(integration.clientId, roleName);
    return getAllowedRoleProps(existingRole as Role);
  }

  public async createCompositeRole(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(compositeRoles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));

    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });

    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    for (let role of compositeRoles) {
      if (role.name.trim().length === 0) throw new createHttpError[400]('invalid role');
      if (role.name === roleName) throw new createHttpError[400](`role ${roleName} cannot be associated with itself`);
    }
    const compositeRoleNames = compositeRoles.map(({ name }) => name);
    await assertRolesExist(KeycloakService, int.clientId, [roleName, ...compositeRoleNames]);

    const updatedRole = await audit.runAuditedOperation(
      roleOperation(
        'role-composite-update',
        { requestId: int.id, environment: environment as Environment, roleName },
        { add: compositeRoleNames, remove: [] },
      ),
      () => KeycloakService.createCompositeRole(int.clientId, roleName, compositeRoles),
      {
        onSuccess: (transaction) =>
          createCompositeRolesDB(roleName, compositeRoleNames, int.id, environment, transaction),
      },
    );

    return getAllowedRoleProps(updatedRole);
  }

  public async getCompositeRoles(authz: AuthContext, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.READ,
    });
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const compositeRole = await keycloakService.getCompositeRoles(int.clientId, roleName);
    return updateRoleProps(compositeRole);
  }

  public async getCompositeRole(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.READ,
    });

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    const compositeRole = await keycloakService.getCompositeRoles(int.clientId, roleName, compositeRoleName);

    return getAllowedRoleProps(compositeRole);
  }

  public async deleteCompositeRole(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    await assertRolesExist(keycloakService, int.clientId, [roleName, compositeRoleName]);

    await audit.runAuditedOperation(
      roleOperation(
        'role-composite-update',
        { requestId: int.id, environment: environment as Environment, roleName },
        { add: [], remove: [compositeRoleName] },
      ),
      () => keycloakService.deleteCompositeRole(int.clientId, roleName, compositeRoleName),
      {
        onSuccess: (transaction) =>
          deleteCompositeRolesDB(roleName, compositeRoleName, int.id, environment, transaction),
      },
    );
  }
}
