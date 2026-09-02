import { UserService } from '@/services/user-service';
import { inject, injectable } from 'tsyringe';
import { ListBceidUsersFilterQuery, ListUsersFilterQuery } from '@/types';
import { AuthContext } from '@/modules/authorization';

@injectable()
export class UserController {
  constructor(@inject('UserService') private userService: UserService) {}

  public async listUsers(environment: string, idp: string, query: ListUsersFilterQuery) {
    return await this.userService.getUsers(environment, idp, query);
  }

  public async listBceidUsers(
    authz: AuthContext,
    integrationId: number,
    environment: string,
    query: ListBceidUsersFilterQuery,
  ) {
    return await this.userService.getBceidUsers(authz, integrationId, environment, query);
  }
}
