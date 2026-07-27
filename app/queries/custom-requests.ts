import { models } from '@app/shared/sequelize/models/models';

export const doSkipPrivacyZoneScope = async (requestId: number) => {
  const customRequest = await models.customRequest.findOne({
    where: {
      requestId: requestId,
      conditions: {
        skipPrivacyZoneScope: true,
      },
    },
  });

  if (customRequest) {
    return true;
  }

  return false;
};
