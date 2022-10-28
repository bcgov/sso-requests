import { ListUsersFilterQuery } from '../types';
import { injectable } from 'tsyringe';
import { searchUsersByIdp } from '@lambda-app/keycloak/users';
import {
  findBceidUserQueryValidator,
  findCommonUserQueryValidator,
  findGithubUserQueryValidator,
} from '../schemas/user';
import createHttpError from 'http-errors';
import { parseErrors } from '../util';

@injectable()
export class UserService {
  public async getUsers(environment: string, idp: string, query: ListUsersFilterQuery) {
    let valid;
    if (idp.startsWith('bceid')) {
      valid = findBceidUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findBceidUserQueryValidator.errors));
    } else if (idp.startsWith('github')) {
      valid = findGithubUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findGithubUserQueryValidator.errors));
    } else {
      valid = findCommonUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findCommonUserQueryValidator.errors));
    }

    const userRows = await searchUsersByIdp({ environment, idp, userProperties: query });
    return userRows.rows;
  }
}
