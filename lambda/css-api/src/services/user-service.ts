import { ListCommonUsersQuery } from '../types';
import { injectable } from 'tsyringe';
import { searchUsersByIdp } from '@lambda-app/keycloak/users';
import { findBceidUserQueryValidator, findCommonUserQueryValidator } from '../schemas/user';
import createHttpError from 'http-errors';
import { parseErrors } from '../util';

@injectable()
export class UserService {
  public async getAllCommonUsers(environment: string, idp: string, query: ListCommonUsersQuery) {
    const valid = findCommonUserQueryValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(findCommonUserQueryValidator.errors));
    const userRows = await searchUsersByIdp({ environment, idp, userProperties: query });
    return userRows.rows;
  }

  public async getAllBceidUsers(environment: string, idp: string, query: ListCommonUsersQuery) {
    const valid = findBceidUserQueryValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(findBceidUserQueryValidator.errors));
    const userRows = await searchUsersByIdp({ environment, idp, userProperties: query });
    return userRows.rows;
  }
}
