import { Op, Model } from 'sequelize';
import map from 'lodash.map';
import compact from 'lodash.compact';
import flatten from 'lodash.flatten';
import uniq from 'lodash.uniq';
import { models } from '@app/shared/sequelize/models/models';
import { IntegrationData } from '@app/shared/interfaces';
import { getTeamById } from '@app/queries/team';
import { getUserById } from '@app/queries/user';
import { idpMap, envMap } from '@app/helpers/meta';
import { Integration } from '@app/interfaces/Request';
import path from 'path';
import fs from 'fs';

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

  const accountableEntity = (await getAccountableEntity(integration)) || '';

  const {
    devValidRedirectUris = [],
    testValidRedirectUris = [],
    prodValidRedirectUris = [],
    environments = [],
    authType = 'browser-login',
  } = integration;

  const idps = integration.devIdps;
  const idpNames = idps?.map((idp) => idpMap[idp]).join(', ');
  const envNames = environments.map((env) => envMap[env]).join(', ');
  const redirectUris = environments.map((env) => ({
    name: envMap[env],
    uris: integration[`${env}ValidRedirectUris` as keyof Integration] || [],
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

export const getAccountableEntity = async (integration: Integration) => {
  if (integration.usesTeam === true) {
    const team = integration.team ? integration.team : await getTeamById(Number(integration.teamId));
    return team?.name || '';
  } else {
    const user = integration.user ? integration.user : await getUserById(integration?.userId!);
    return user?.displayName || '';
  }
};

export const getUserEmails = (user: any, primaryEmailOnly: boolean = false) =>
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

export const isNonProdDigitalCredentialRequest = (integration: IntegrationData) => {
  return integration?.devIdps?.includes('digitalcredential') && !integration?.environments?.includes('prod');
};

/**
 * Resolve path to email attachments based on environment, since the lambda build flattens out the directories
 * @param filename Name of the file
 */

export const getEmailTemplate = (templatePath: string) => {
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    return fs.readFileSync(`${process.cwd()}/shared/templates/${templatePath}`, 'utf8');
  } else {
    return '<p>Template not found</p>';
  }
};
