import {
  createRole,
  deleteRole,
  listClientRoles,
  updateRole,
  findClientRole,
  manageRoleComposites,
} from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { validate } from '../schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '../helpers/roles';

export type Role = {
  name: string;
};

@injectable()
export class RoleService {
  constructor(private integrationService: IntegrationService) {}

  public async getAllByEnvironment(teamId: number, integrationId: number, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const intRoles = await listClientRoles(int, { environment, integrationId });
    return updateRoleProps(intRoles);
  }

  public async getByName(teamId: number, integrationId: number, environment: string, roleName: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const role = await findClientRole(int, { environment, roleName });
    if (!role) throw new createHttpError[404](`role ${roleName} not found`);
    return getAllowedRoleProps(role);
  }

  public async createRole(teamId: number, integrationId: number, role: Role, environment: string) {
    this.validateRole(role);
    if (await this.checkForExistingRole(teamId, integrationId, environment, role.name))
      throw new createHttpError[409](`role ${role.name} already exists`);
    const int = await this.integrationService.getById(integrationId, teamId);
    const roleObj: any = await createRole(int, { environment, integrationId, roleName: role.name });
    return getAllowedRoleProps(roleObj);
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
    this.validateRole(role);
    if (await this.checkForExistingRole(teamId, integrationId, environment, role.name))
      throw new createHttpError[409](`role ${role.name} already exists`);
    const int = await this.integrationService.getById(integrationId, teamId);
    await updateRole(int, { environment, integrationId, roleName, newRoleName: role.name });
    return role;
  }

  public validateRole(role: Role) {
    const valid = validate(role);
    if (!valid) throw new createHttpError[400]('invalid role');
    const roleName = role.name.trim();
    if (roleName.length === 0) throw new createHttpError[400]('invalid role');
  }

  public async checkForExistingRole(teamId: number, integrationId: number, environment: string, roleName: string) {
    const existingRole = await this.getByName(teamId, integrationId, environment, roleName);
    return getAllowedRoleProps(existingRole);
  }

  public async createCompositeRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoles: Role[],
  ) {
    let rolesToAdd = [];

    const int = await this.integrationService.getById(integrationId, teamId);

    const existingRoles = await listClientRoles(int, { environment, integrationId });

    const role = existingRoles.find((role) => role.name === roleName);

    if (!role) throw new createHttpError[404](`role ${roleName} not found`);

    for (let role of compositeRoles) {
      this.validateRole(role);
      if (role.name === roleName) throw new createHttpError[400](`role ${roleName} cannot be associated with itself`);
      if (!existingRoles.find((existingRole) => existingRole.name === role.name))
        throw new createHttpError[404](`role ${role.name} not found`);
      rolesToAdd.push(existingRoles.find((existingRole) => role.name === existingRole.name));
    }
    await manageRoleComposites(int, environment, role.id, rolesToAdd, 'add');
    return await this.getByName(teamId, integrationId, environment, roleName);
  }

  public async getCompositeRoles(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingRoles = await listClientRoles(int, { environment, integrationId });
    const role = existingRoles.find((role) => role.name === roleName);

    if (!role) throw new createHttpError[404](`role ${roleName} not found`);

    return updateRoleProps(await manageRoleComposites(int, environment, role.id));
  }

  public async getCompositeRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingRoles = await listClientRoles(int, { environment, integrationId });
    const role = existingRoles.find((role) => role.name === roleName);
    const compositeRole = existingRoles.find((role) => role.name === compositeRoleName);

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    if (!role) throw new createHttpError[404](`role ${roleName} not found`);

    if (!compositeRole) throw new createHttpError[404](`role ${compositeRoleName} not found`);

    const compRoles = await manageRoleComposites(int, environment, role.id);

    if (!compRoles.find((role) => role.name === compositeRoleName))
      throw new createHttpError[404](`role ${compositeRoleName} is not associated with ${roleName}`);

    return getAllowedRoleProps(compRoles.find((role) => role.name === compositeRoleName));
  }

  public async deleteCompositeRole(
    teamId: number,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingRoles = await listClientRoles(int, { environment, integrationId });
    const role = existingRoles.find((role) => role.name === roleName);
    const compositeRole = existingRoles.find((role) => role.name === compositeRoleName);

    if (!role) throw new createHttpError[404](`role ${roleName} not found`);

    if (!compositeRole) throw new createHttpError[404](`role ${compositeRoleName} not found`);

    if (roleName === compositeRoleName)
      throw new createHttpError[400](`role name and composite role name cannot be same`);

    const compRoles = await manageRoleComposites(int, environment, role.id);

    if (!compRoles.find((role) => role.name === compositeRoleName))
      throw new createHttpError[404](`role ${compositeRoleName} is not associated with ${roleName}`);

    await manageRoleComposites(int, environment, role.id, [compositeRole], 'del');
  }
}
