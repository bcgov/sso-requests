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

// Returns the full row without applying any authorization predicate. Callers must
// assert a grant before exposing the result; IntegrationService is the only caller.
export const getUnscopedIntegrationById = (integrationId: number, options = { raw: true }) => {
  return models.request.findOne({
    where: { id: integrationId, apiServiceAccount: false, archived: false },
    ...options,
  });
};

export const getIntegrationsWhere = async (
  scope: Record<string | symbol, any>,
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
