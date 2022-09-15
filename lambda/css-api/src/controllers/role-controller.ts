import { validate } from '../schemas/role';
import { parseErrors } from '../util';
import { injectable } from 'tsyringe';
import { RoleService } from '../services/role-service';

type Role = {
  name: string;
};

@injectable()
export class RoleController {
  constructor(private roleService: RoleService) {}

  public async get(teamId: number, integrationId: number, environment: string, roleName: string) {
    return await this.roleService.getByName(teamId, integrationId, environment, roleName);
  }

  public async list(teamId: number, integrationId: number, environment: string) {
    const roles = await this.roleService.getAllByEnvironment(teamId, integrationId, environment);
    return roles.map((role) => {
      return {
        name: role,
      };
    });
  }

  public async create(teamId: number, integrationId: number, role: Role, environment: string) {
    const valid = validate(role);
    if (!valid) throw Error(parseErrors(validate.errors));
    const existingRoles = await this.roleService.getAllByEnvironment(teamId, integrationId, environment);
    if (existingRoles.includes(role.name)) throw Error(`role ${role.name} already exists`);
    return await this.roleService.createRole(teamId, integrationId, role.name, environment);
  }

  public async delete(teamId: number, integrationId: number, roleName: string, environment: string) {
    return await this.roleService.deleteRole(teamId, integrationId, roleName, environment);
  }

  public async update(teamId: number, integrationId: number, roleName: string, environment: string, role: Role) {
    const valid = validate(role);
    if (!valid) throw Error(parseErrors(validate.errors));
    return await this.roleService.updateRole(teamId, integrationId, roleName, environment, role.name);
  }
}
