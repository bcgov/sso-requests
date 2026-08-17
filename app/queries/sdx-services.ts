import { models } from '@app/shared/sequelize/models/models';
import type { Transaction } from 'sequelize';
import { SDXAccessRequest } from '@app/shared/interfaces';

export const createSdxAccessRequest = async (
  transaction: Transaction,
  userDisplayName: string,
  requestId: number,
  sdxRequestData: SDXAccessRequest,
) => {
  const submissionId = require('uuid').v4();
  return await models.SdxRequest.create(
    {
      request_id: requestId,
      submission_id: submissionId,
      requester: userDisplayName,
      access_request: sdxRequestData,
    },
    { transaction },
  );
};
