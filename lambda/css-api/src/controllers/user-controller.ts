import { UserService } from '../services/user-service';
import { injectable } from 'tsyringe';
import { ListCommonUsersQuery } from '../types';

@injectable()
export class UserController {
  constructor(private userService: UserService) {}

  public async listCommonUsers(environment: string, idp: string, query: ListCommonUsersQuery) {
    return await this.userService.getAllCommonUsers(environment, idp, query);
  }

  public async listBceidUsers(environment: string, idp: string, query: ListCommonUsersQuery) {
    return await this.userService.getAllBceidUsers(environment, idp, query);
  }
}
