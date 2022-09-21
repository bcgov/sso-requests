import { createRole, deleteRole, listClientRoles, updateRole } from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { validate } from '../schemas/role';
import { parseErrors } from '../util';

export type Role = {
  name: string;
};

@injectable()
export class RoleService {
  constructor(private integrationService: IntegrationService) {}

  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const intRoles = await listClientRoles(int, { environment, integrationId });
    return intRoles.map((role) => {
      return {
        name: role,
      };
    });
  }

  public async getByName(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const roles = await listClientRoles(int, { environment, integrationId });
    if (!roles.includes(roleName)) throw new createHttpError[404](`role ${roleName} not found`);
    return { name: roleName };
  }

  public async createRole(teamId: number, integrationId: number, role: Role, environment: string) {
    await this.validateRole(teamId, integrationId, environment, role);
    const int = await this.integrationService.getById(integrationId, teamId);
    const roleObj: any = await createRole(int, { environment, integrationId, roleName: role.name });
    return { name: roleObj?.roleName };
  }

  public async deleteRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    if (!(await this.checkForExistingRole(teamId, integrationId, environment, roleName)))
      throw new createHttpError[404](`role ${roleName} not found`);
    return await deleteRole(int, { environment, integrationId, roleName });
  }

  public async updateRole(teamId: number, integrationId: number, roleName: string, environment: string, role: Role) {
    if (!(await this.checkForExistingRole(teamId, integrationId, environment, roleName)))
      throw new createHttpError[404](`role ${roleName} not found`);
    await this.validateRole(teamId, integrationId, environment, role);
    const int = await this.integrationService.getById(integrationId, teamId);
    await updateRole(int, { environment, integrationId, roleName, newRoleName: role.name });
    return role;
  }

  public async validateRole(teamId: number, integrationId: number, environment: string, role: Role) {
    const valid = validate(role);
    if (!valid) throw new createHttpError[400]('invalid role');
    const roleName = role.name.trim();
    if (roleName.length === 0) throw new createHttpError[400]('invalid role');
    if (await this.checkForExistingRole(teamId, integrationId, environment, role.name))
      throw new createHttpError[409](`role ${role.name} already exists`);
  }

  public async checkForExistingRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const existingRoles = await this.getAllByEnvironment(teamId, integrationId, environment);
    return existingRoles.find((intRole) => roleName === intRole.name);
  }
}
