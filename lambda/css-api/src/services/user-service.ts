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
  public async getUsers(environment: string, idp: string, query: any) {
    let valid;
    if (idp.startsWith('bceid')) {
      valid = findBceidUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findBceidUserQueryValidator.errors));
    } else if (idp.startsWith('github')) {
      valid = findGithubUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findGithubUserQueryValidator.errors));
      delete Object.assign(query, { firstName: query.name })['name'];
      delete Object.assign(query, { lastName: query.login })['login'];
    } else {
      valid = findCommonUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findCommonUserQueryValidator.errors));
    }
    const userRows = await searchUsersByIdp({ environment, idp, userProperties: query });
    if (idp.startsWith('github')) {
      return userRows.rows.map((row) => {
        return { ...row, firstName: '', lastName: '' };
      });
    }
    return userRows.rows;
  }
}
