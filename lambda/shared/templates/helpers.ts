import { Op } from 'sequelize';
import { map, compact, flatten } from 'lodash';
import { models } from '@lambda-shared/sequelize/models/models';
import { formatUrisForEmail, realmToIDP } from '@lambda-shared/utils/helpers';
import { Data } from '@lambda-shared/interfaces';
import { getTeamById } from '@lambda-app/queries/team';
import { getUserById } from '@lambda-app/queries/user';

export const processRequest = async (integration: any) => {
  if (integration instanceof models.request) {
    integration = integration.get({ plain: true });
  }

  let accountableEntity = '';

  if (integration.usesTeam === true) {
    const team = integration.team ? integration.team : await getTeamById(integration.teamId);
    accountableEntity = team?.name || '';
  } else {
    const user = integration.user ? integration.user : await getUserById(integration.userId);
    accountableEntity = user?.displayName || '';
  }

  const { realm, devValidRedirectUris = [], testValidRedirectUris = [], prodValidRedirectUris = [] } = integration;
  const devUris = formatUrisForEmail(devValidRedirectUris, 'Development');
  const testUris = formatUrisForEmail(testValidRedirectUris, 'Test');
  const prodUris = formatUrisForEmail(prodValidRedirectUris, 'Production');
  const idps = realmToIDP(realm);

  return {
    ...integration,
    devValidRedirectUris,
    testValidRedirectUris,
    prodValidRedirectUris,
    devUris,
    testUris,
    prodUris,
    idps,
    accountableEntity,
  };
};

export const getUserEmails = (user) => compact([user.idirEmail, user.additionalEmail]);

export const getTeamEmails = async (teamId: number, roles: string[] = ['user', 'admin']) => {
  const users = await models.user.findAll({
    where: {},
    include: [
      {
        model: models.usersTeam,
        where: { teamId, role: { [Op.in]: roles }, pending: false },
        required: true,
        attributes: [],
      },
    ],
    attributes: ['id', 'idirEmail', 'additionalEmail'],
    raw: true,
  });

  return flatten(map(users, getUserEmails));
};

export const getIntegrationEmails = async (integration: Data) => {
  if (integration.usesTeam === true) {
    return getTeamEmails(Number(integration.teamId));
  } else if (integration.user) {
    return getUserEmails(integration.user);
  } else if (integration.userId) {
    const user = await models.user.findOne({
      where: { userId: integration.userId },
      attributes: ['id', 'idirEmail', 'additionalEmail'],
      raw: true,
    });

    return getUserEmails(user);
  }

  return [];
};
