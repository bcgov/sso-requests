import { container, inject, singleton } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { roleValidator, listOfrolesValidator } from '@/schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '@/helpers/roles';
import { Role, RolePayload } from '@/types';
import { AuthContext } from '@/modules/authorization';
import { ACTIONS, RESOURCES } from '@sso/authz';
import { parseErrors, runAuditedOperation } from '@/utils';
import { KeycloakServiceFactory } from './keycloak-service';
import models from '@/sequelize/models/models';
import { createCompositeRolesDB, deleteCompositeRolesDB, destroyRequestRole } from '@/sequelize/queries/requestRoles';
import { EVENTS } from '../../../app/shared/enums';

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
    const kcRole = await runAuditedOperation(
      {
        eventCode: EVENTS.ROLE_CREATE_REQUESTED,
        requestId: integrationId,
        actorType: 'service-account',
        actorId: authz.apiClientId,
        details: { roleName: role.name, environment },
      },
      EVENTS.ROLE_CREATE_SUCCESS,
      EVENTS.ROLE_CREATE_FAILURE,
      () => KeycloakService.createClientRole(int.clientId, role),
    );
    if (kcRole) {
      await models.requestRole.create({
        name: role?.name,
        environment: environment,
        requestId: integrationId,
      });
    }
    return getAllowedRoleProps(kcRole);
  }

  public async deleteRole(authz: AuthContext, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, authz, {
      resource: RESOURCES.ROLES,
      action: ACTIONS.WRITE,
    });
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    await runAuditedOperation(
      {
        eventCode: EVENTS.ROLE_DELETE_REQUESTED,
        requestId: integrationId,
        actorType: 'service-account',
        actorId: authz.apiClientId,
        details: { roleName, environment },
      },
      EVENTS.ROLE_DELETE_SUCCESS,
      EVENTS.ROLE_DELETE_FAILURE,
      () => KeycloakService.deleteClientRole(int.clientId, roleName),
    );
    await destroyRequestRole(int?.id, roleName, environment);
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
    const updatedRole = await runAuditedOperation(
      {
        eventCode: EVENTS.ROLE_UPDATE_REQUESTED,
        requestId: integrationId,
        actorType: 'service-account',
        actorId: authz.apiClientId,
        details: { roleName, environment, update: true },
      },
      EVENTS.ROLE_UPDATE_SUCCESS,
      EVENTS.ROLE_UPDATE_FAILURE,
      () => KeycloakService.updateClientRole(int.clientId, roleName, role),
    );
    if (updatedRole) {
      const dbRole = await models.requestRole.findOne({
        where: {
          name: roleName,
          environment: environment,
          requestId: integrationId,
        },
      });
      // if role exists in db then update else create
      if (dbRole) {
        dbRole.name = role?.name;
        dbRole.environment = environment;
        await dbRole.save();
      } else {
        await models.requestRole.create({
          name: role?.name,
          environment: environment,
          requestId: integrationId,
        });
      }
    }
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
    const updatedRole = await runAuditedOperation(
      {
        eventCode: EVENTS.ROLE_UPDATE_REQUESTED,
        requestId: integrationId,
        actorType: 'service-account',
        actorId: authz.apiClientId,
        details: { roleName, composite: true, compositeRoleNames: compositeRoles.map(({ name }) => name), environment },
      },
      EVENTS.ROLE_UPDATE_SUCCESS,
      EVENTS.ROLE_UPDATE_FAILURE,
      () => KeycloakService.createCompositeRole(int.clientId, roleName, compositeRoles),
    );

    if (updatedRole) {
      await createCompositeRolesDB(
        roleName,
        compositeRoles.map((r) => r.name),
        int?.id,
        environment,
      );
    }

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

    await runAuditedOperation(
      {
        eventCode: EVENTS.ROLE_UNASSIGN_REQUESTED,
        requestId: integrationId,
        actorType: 'service-account',
        actorId: authz.apiClientId,
        details: { roleName, compositeRoleName, environment },
      },
      EVENTS.ROLE_UNASSIGN_SUCCESS,
      EVENTS.ROLE_UNASSIGN_FAILURE,
      () => keycloakService.deleteCompositeRole(int.clientId, roleName, compositeRoleName),
    );
    await deleteCompositeRolesDB(roleName, compositeRoleName, int?.id, environment);
  }
}
