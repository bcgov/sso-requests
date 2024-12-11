import { UserService } from '../services/user-service';
import { inject, injectable } from 'tsyringe';
import { ListUsersFilterQuery } from '../types';

@injectable()
export class UserController {
  constructor(@inject('UserService') private userService: UserService) {}

  public async listUsers(environment: string, idp: string, query: ListUsersFilterQuery) {
    return await this.userService.getUsers(environment, idp, query);
  }
}
