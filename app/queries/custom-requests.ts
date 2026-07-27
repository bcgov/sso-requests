import { models } from '@app/shared/sequelize/models/models';

export const doSkipPrivacyZoneScope = async (requestId: number) => {
  const customRequest = await models.customRequest.findOne({
    where: {
      requestId: requestId,
    },
  });

  if (customRequest?.conditions?.skipPrivacyZoneScope) {
    return true;
  }

  return false;
};
