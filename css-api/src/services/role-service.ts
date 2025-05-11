import { container, inject, singleton } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { roleValidator, listOfrolesValidator } from '../schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '../helpers/roles';
import { Role, RolePayload } from '../types';
import { parseErrors } from '../util';
import { KeycloakServiceFactory } from './keycloak-service';
import { sql } from '../db';
import { IntegrationRole } from '../models';

@singleton()
export class RoleService {
  keycloakServiceFactory = container.resolve(KeycloakServiceFactory);
  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const intRoles = await listClientRoles(int, { environment, integrationId });
    return updateRoleProps(intRoles);
  }

  public async getByName(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const role = await findClientRole(int, { environment, roleName });
    if (!role) throw new createHttpError[404](`role ${roleName} not found`);
    return getAllowedRoleProps(role as Role);
  }

  public async createRole(teamId: number, integrationId: number, role: RolePayload, environment: string) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, teamId);
    const KeycloakService = this.keycloakServiceFactory.getKeycloakService(environment);
    const kcRole = await KeycloakService.createClientRole(int.clientId, role);
    if (kcRole) {
      await sql`
        INSERT INTO request_role (name, environment, request_id)
        VALUES (${role?.name}, ${environment}, ${integrationId})
        ON CONFLICT (name, environment, request_id) DO NOTHING
        `;
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
      const dbRole = await sql<IntegrationRole[]>`
        SELECT * FROM request_role
        WHERE name = ${roleName} AND environment = ${environment} AND request_id = ${integrationId}
      `[0];
      // if role exists in db then update else create
      if (dbRole) {
        dbRole.name = role?.name;
        dbRole.environment = environment;
        await dbRole.save();
      } else {
        await sql`
        INSERT INTO request_role (name, environment, request_id)
        VALUES (${role?.name}, ${environment}, ${integrationId})
        ON CONFLICT (name, environment, request_id) DO NOTHING
        `;
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

  public async checkForExistingRole(integration: Integration, environment: string, roleName: string) {
    const existingRole = await findClientRole(integration, { environment, roleName });
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
