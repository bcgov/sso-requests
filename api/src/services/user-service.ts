import { container, inject, injectable } from 'tsyringe';
import {
  findBceidLegacyUserQueryValidator,
  findBceidUserQueryValidator,
  findCommonUserQueryValidator,
  findGithubUserQueryValidator,
} from '@/schemas/user';
import createHttpError from 'http-errors';
import { parseErrors } from '@/utils';
import { IntegrationService } from '@/services/integration-service';
import { KeycloakServiceFactory } from '@/services/keycloak-service';

@injectable()
export class UserService {
  keycloakServiceFactory = container.resolve(KeycloakServiceFactory);

  constructor(@inject('IntegrationService') private integrationService: IntegrationService) {}

  public async getUsers(environment: string, idp: string, query: any, requireId: boolean = false) {
    let valid = false;
    const userQuery = {
      email: query.email ?? '',
      username: query.guid != null ? `${query.guid}@${idp}` : `@${idp}`,
    };
    if (idp.startsWith('bceid')) {
      valid = findBceidLegacyUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findBceidLegacyUserQueryValidator.errors));
      Object.assign(userQuery, { firstName: query.displayName });
      Object.assign(userQuery, { lastName: query.username });
    } else if (idp.startsWith('github')) {
      valid = findGithubUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findGithubUserQueryValidator.errors));
      Object.assign(userQuery, { firstName: query.name });
      Object.assign(userQuery, { lastName: query.login });
    } else {
      valid = findCommonUserQueryValidator(query || {});
      if (!valid) throw new createHttpError[400](parseErrors(findCommonUserQueryValidator.errors));
      Object.assign(userQuery, { firstName: query.firstName });
      Object.assign(userQuery, { lastName: query.lastName });
    }
    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    const userRows = await keycloakService.getUsers(userQuery);

    return userRows.map((user) => {
      return {
        firstName: idp.startsWith('github') ? '' : user.firstName,
        lastName: idp.startsWith('github') ? '' : user.lastName,
        email: user.email,
        username: user.username,
        attributes: user.attributes,
      };
    });
  }

  public getBceidUsers = async (teamId: number, integrationId: number, environment: string, query: any) => {
    const bceidUsers = [];
    const valid = findBceidUserQueryValidator(query || {});
    if (!valid) throw new createHttpError[400](parseErrors(findBceidUserQueryValidator.errors));

    const int = await this.integrationService.getById(integrationId, teamId);

    const idp = `bceid${query.bceidType}`;

    const keycloakService = this.keycloakServiceFactory.getKeycloakService(environment);

    const userRows = await keycloakService.getUsers({
      username: query.guid != null ? `${query.guid}@${idp}` : `@${idp}`,
      email: query.email,
      firstName: query.displayName,
      lastName: query.username,
    });

    for (const user of userRows) {
      const roles = await keycloakService.getUserRealmRoles(user.username);
      if (roles.find((role) => role.name === `client-${int.clientId}`)) bceidUsers.push(user);
    }

    return bceidUsers.map((user) => {
      return {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        attributes: user.attributes,
      };
    });
  };
}
