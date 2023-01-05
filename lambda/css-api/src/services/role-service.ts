import {
  createRole,
  deleteRole,
  listClientRoles,
  updateRole,
  findClientRole,
  manageRoleComposites,
  getRoleComposites,
} from '@lambda-app/keycloak/users';
import { injectable } from 'tsyringe';
import { IntegrationService } from './integration-service';
import createHttpError from 'http-errors';
import { roleValidator, listOfrolesValidator } from '../schemas/role';
import { getAllowedRoleProps, updateRoleProps } from '../helpers/roles';
import { Role, RolePayload } from '../types';
import { Integration } from 'app/interfaces/Request';
import { parseErrors } from '../util';

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
    return getAllowedRoleProps(role as Role);
  }

  public async createRole(teamId: number, integrationId: number, role: RolePayload, environment: string) {
    this.validateRole(role);
    const int = await this.integrationService.getById(integrationId, teamId);
    const roleObj: any = await createRole(int, { environment, integrationId, roleName: role.name });
    return getAllowedRoleProps((await findClientRole(int, { environment, roleName: roleObj?.roleName })) as Role);
  }

  public async deleteRole(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    return await deleteRole(int, { environment, integrationId, roleName });
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
    await updateRole(int, { environment, integrationId, roleName, newRoleName: role.name });
    return getAllowedRoleProps((await findClientRole(int, { environment, roleName: role.name })) as Role);
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
    let rolesToAdd = [];
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingRoles = await listClientRoles(int, { environment, integrationId });
    const role = existingRoles.find((role) => role.name === roleName);
    if (!role) throw new createHttpError[404](`role ${roleName} not found`);
    const valid = listOfrolesValidator(compositeRoles);
    if (!valid) throw new createHttpError[400](parseErrors(listOfrolesValidator.errors));
    for (let role of compositeRoles) {
      if (role.name.trim().length === 0) throw new createHttpError[400]('invalid role');
      if (role.name === roleName) throw new createHttpError[400](`role ${roleName} cannot be associated with itself`);
      if (!existingRoles.find((existingRole) => existingRole.name === role.name))
        throw new createHttpError[404](`role ${role.name} not found`);
      rolesToAdd.push(existingRoles.find((existingRole) => role.name === existingRole.name));
    }
    await manageRoleComposites(environment, role.id, rolesToAdd, 'add');
    return getAllowedRoleProps((await findClientRole(int, { environment, roleName })) as Role);
  }

  public async getCompositeRoles(teamId: number, integrationId: number, roleName: string, environment: string) {
    const int = await this.integrationService.getById(integrationId, teamId);
    const existingRoles = await listClientRoles(int, { environment, integrationId });
    const role = existingRoles.find((role) => role.name === roleName);

    if (!role) throw new createHttpError[404](`role ${roleName} not found`);

    return updateRoleProps((await getRoleComposites(int, environment, role.id)) as Role[]);
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

    const compRoles = await getRoleComposites(int, environment, role.id);

    if (!compRoles.find((role) => role.name === compositeRoleName))
      throw new createHttpError[404](`role ${compositeRoleName} is not associated with ${roleName}`);

    return getAllowedRoleProps(compRoles.find((role) => role.name === compositeRoleName) as Role);
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

    const compRoles = await getRoleComposites(int, environment, role.id);

    if (!compRoles.find((role) => role.name === compositeRoleName))
      throw new createHttpError[404](`role ${compositeRoleName} is not associated with ${roleName}`);

    await manageRoleComposites(environment, role.id, [compositeRole], 'del');
  }
}
