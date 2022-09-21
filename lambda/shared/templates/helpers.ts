import { Op, Model } from 'sequelize';
import map from 'lodash.map';
import compact from 'lodash.compact';
import flatten from 'lodash.flatten';
import uniq from 'lodash.uniq';
import { models } from '@lambda-shared/sequelize/models/models';
import { IntegrationData } from '@lambda-shared/interfaces';
import { getTeamById } from '@lambda-app/queries/team';
import { getUserById } from '@lambda-app/queries/user';
import { idpMap, envMap } from '@app/helpers/meta';
import { Integration } from '@app/interfaces/Request';
import { silverRealmIdpsMap } from '@app/helpers/meta';

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

export const processRequest = async (integrationOrModel: any) => {
  let integration!: Integration;
  if (integrationOrModel instanceof models.request) {
    integration = integrationOrModel.get({ plain: true });
  } else {
    integration = integrationOrModel;
  }

  let accountableEntity = '';

  if (integration.usesTeam === true) {
    const team = integration.team ? integration.team : await getTeamById(Number(integration.teamId));
    accountableEntity = team?.name || '';
  } else {
    const user = integration.user ? integration.user : await getUserById(integration.userId);
    accountableEntity = user?.displayName || '';
  }

  const {
    realm,
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
    environments = [],
    authType = 'browser-login',
  } = integration;

  const idps = integration.serviceType === 'gold' ? integration.devIdps : silverRealmIdpsMap[realm || 'onestopauth'];
  const idpNames = idps.map((idp) => idpMap[idp]).join(', ');
  const envNames = environments.map((env) => envMap[env]).join(', ');
  const redirectUris = environments.map((env) => ({
    name: envMap[env],
    uris: integration[`${env}ValidRedirectUris`] || [],
  }));
  const browserLoginEnabled = authType !== 'service-account';

  return {
    ...integration,
    devValidRedirectUris,
    testValidRedirectUris,
    prodValidRedirectUris,
    idps,
    idpNames,
    envNames,
    redirectUris,
    accountableEntity,
    browserLoginEnabled,
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
