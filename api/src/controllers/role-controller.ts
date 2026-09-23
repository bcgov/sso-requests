import { inject, injectable } from 'tsyringe';
import { RoleService } from '@/services/role-service';
import { RolePayload } from '@/types';
import { AuthContext } from '@/modules/authorization';

@injectable()
export class RoleController {
  constructor(@inject('RoleService') private roleService: RoleService) {}

  public async get(authz: AuthContext, integrationId: number, environment: string, roleName: string) {
    return await this.roleService.getByName(authz, integrationId, environment, roleName);
  }

  public async list(authz: AuthContext, integrationId: number, environment: string) {
    return await this.roleService.getAllByEnvironment(authz, integrationId, environment);
  }

  public async create(authz: AuthContext, integrationId: number, role: RolePayload, environment: string) {
    return await this.roleService.createRole(authz, integrationId, role, environment);
  }

  public async delete(authz: AuthContext, integrationId: number, roleName: string, environment: string) {
    return await this.roleService.deleteRole(authz, integrationId, roleName, environment);
  }

  public async update(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    role: RolePayload,
  ) {
    return await this.roleService.updateRole(authz, integrationId, roleName, environment, role);
  }

  public async createComposite(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoles: any,
  ) {
    return await this.roleService.createCompositeRole(authz, integrationId, roleName, environment, compositeRoles);
  }

  public async getComposites(authz: AuthContext, integrationId: number, roleName: string, environment: string) {
    return await this.roleService.getCompositeRoles(authz, integrationId, roleName, environment);
  }

  public async getComposite(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    return await this.roleService.getCompositeRole(authz, integrationId, roleName, environment, compositeRoleName);
  }

  public async deleteComposite(
    authz: AuthContext,
    integrationId: number,
    roleName: string,
    environment: string,
    compositeRoleName: string,
  ) {
    return await this.roleService.deleteCompositeRole(authz, integrationId, roleName, environment, compositeRoleName);
  }
}
