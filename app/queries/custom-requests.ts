import { models } from '@app/shared/sequelize/models/models';
import { Op } from 'sequelize/lib/operators';

export const doSkipPrivacyZoneScope = async (requestId: number) => {
  const customRequest = await models.customRequest.findOne({
    where: {
      requestId: requestId,
      conditions: {
        [Op.contains]: { skipPrivacyZoneScope: true },
      },
    },
  });

  if (customRequest) {
    return true;
  }

  return false;
};
