import { Op } from 'sequelize';
import { map, compact, flatten, uniq } from 'lodash';
import { models } from '@lambda-shared/sequelize/models/models';
import { formatUrisForEmail, realmToIDP } from '@lambda-shared/utils/helpers';
import { IntegrationData } from '@lambda-shared/interfaces';
import { getTeamById } from '@lambda-app/queries/team';
import { getUserById } from '@lambda-app/queries/user';
import { idpMap } from '@app/helpers/meta';

export const processTeam = async (team: any) => {
  if (team instanceof models.team) {
    team = team.get({ plain: true, clone: true });
  }

  return team;
};

export const processUser = async (user: any) => {
  if (user instanceof models.user) {
    user = user.get({ plain: true, clone: true });
  }

  return user;
};

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
  const idps =
    integration.serviceType === 'gold' ? [integration.devIdps.map((idp) => idpMap[idp]).join(', ')] : realmToIDP(realm);

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

export const getUserEmails = (user, primaryEmailOnly = false) =>
  compact(primaryEmailOnly ? [user.idirEmail] : [user.idirEmail, user.additionalEmail]);

export const getTeamEmails = async (teamId: number, primaryEmailOnly = false, roles = ['member', 'admin']) => {
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

  return uniq(flatten(map(users, (user) => getUserEmails(user, primaryEmailOnly))));
};

export const getIntegrationEmails = async (integration: IntegrationData, primaryEmailOnly = false) => {
  if (integration.usesTeam === true) {
    return getTeamEmails(Number(integration.teamId), primaryEmailOnly);
  } else if (integration.user) {
    return getUserEmails(integration.user, primaryEmailOnly);
  } else if (integration.userId) {
    const user = await models.user.findOne({
      where: { id: integration.userId },
      attributes: ['id', 'idirEmail', 'additionalEmail'],
      raw: true,
    });

    return getUserEmails(user, primaryEmailOnly);
  }

  return [];
};

export const processIntegrationList = (integrations: IntegrationData[]) => {
  return Promise.all(
    integrations.map((int) => {
      return processRequest(int);
    }),
  );
};
