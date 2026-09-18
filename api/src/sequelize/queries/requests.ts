import models from '@/sequelize/models/models';

export const getIntegrationById = async (
  integrationId: number,
  attributes: string[] = ['id', 'clientId', 'environments', 'teamId', 'devIdps', 'lastChanges'],
  options = { raw: true },
) => {
  return await models.request.findOne({
    where: { id: integrationId, apiServiceAccount: false, archived: false },
    attributes,
    ...options,
  });
};

/**
 * Fetch an integration without applying any authorization.
 *
 * Authorization needs the row's team before it can decide anything, so the
 * fetch cannot also be the check. Every caller goes through
 * `IntegrationService.getById`, which fetches here and then asserts the permission —
 * never this function directly.
 */
export const getUnscopedIntegrationById = (integrationId: number, options = { raw: true }) => {
  return models.request.findOne({
    where: { id: integrationId, apiServiceAccount: false, archived: false },
    ...options,
  });
};

/**
 * List integrations matching an authorization-derived `where` clause. The
 * clause comes from `accessibleIntegrationsWhere`, so row visibility is decided
 * in SQL and the caller never filters afterwards.
 */
export const getIntegrationsWhere = async (
  scope: any,
  serviceType?: string,
  attributes?: string[],
  options?: { raw: boolean },
) => {
  const where: any = { ...scope, apiServiceAccount: false, archived: false };
  if (serviceType) where.serviceType = serviceType;
  return models.request.findAll({
    where,
    attributes,
    ...options,
  });
};
