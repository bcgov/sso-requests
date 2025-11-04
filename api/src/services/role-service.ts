import { container, inject, singleton } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { roleValidator, listOfrolesValidator } from '@/schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '@/helpers/roles';
import { Role, RolePayload } from '@/types';
import { parseErrors } from '@/utils';
import { KeycloakServiceFactory } from './keycloak-service';
import models from '@/sequelize/models/models';
import { createCompositeRolesDB, deleteCompositeRolesDB, destroyRequestRole } from '@/sequelize/queries/requestRoles';

@singleton()
export class RoleService {
  keycloakServiceFactory = container.resolve(KeycloakServiceFactory);
  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const intRoles = await KeycloakService.listClientRoles(int.clientId);
    return updateRoleProps(intRoles);
  }

  public async getByName(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const role = await KeycloakService.getClientRole(int.clientId, roleName);
    if (!role) throw new createHttpError[404](`role ${roleName} not found`);
    return getAllowedRoleProps(role as Role);
  }

  public async createRole(teamId: number, integrationId: number, role: RolePayload, environment: string) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const kcRole = await KeycloakService.createClientRole(int.clientId, role);
    if (kcRole) {
      await models.requestRole.create({
        name: role?.name,
        environment: environment,
        requestId: integrationId,
      });
    }
    return getAllowedRoleProps(kcRole);
  }

  public async deleteRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    await KeycloakService.deleteClientRole(int.clientId, roleName);
    await destroyRequestRole(int?.id, roleName, environment);
  }

  public async updateRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    role: RolePayload,
  ) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const updatedRole = await KeycloakService.updateClientRole(int.clientId, roleName, role);
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
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoles: RolePayload[],
  ) {
    const valid = listOfrolesValidator(compositeRoles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));

    const int = await this.integrationService.getById(integrationId, teamId);

    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    for (let role of compositeRoles) {
      if (role.name.trim().length === 0) throw new createHttpError[400]('invalid role');
      if (role.name === roleName) throw new createHttpError[400](`role ${roleName} cannot be associated with itself`);
    }
    const updatedRole = await KeycloakService.createCompositeRole(int.clientId, roleName, compositeRoles);

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

  public async getCompositeRoles(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const compositeRole = await keycloakService.getCompositeRoles(int.clientId, roleName);
    return updateRoleProps(compositeRole);
  }

  public async getCompositeRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    const compositeRole = await keycloakService.getCompositeRoles(int.clientId, roleName, compositeRoleName);

    return getAllowedRoleProps(compositeRole);
  }

  public async deleteCompositeRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    await keycloakService.deleteCompositeRole(int.clientId, roleName, compositeRoleName);
    await deleteCompositeRolesDB(roleName, compositeRoleName, int?.id, environment);
  }
}
