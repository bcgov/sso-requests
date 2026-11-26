import { models } from '@app/shared/sequelize/models/models';
import type { Transaction } from 'sequelize';
import { SDXAccessRequest } from '@app/shared/interfaces';

export const isArchivedSdxIntegration = async (requestId: number): Promise<boolean> =>
  Boolean(
    await models.request.findOne({
      where: { id: requestId, apiServiceAccount: false, archived: true },
      attributes: ['id'],
      raw: true,
    }),
  );

export const createSdxAccessRequest = async (
  submissionId: number,
  userDisplayName: string,
  requestId: number,
  sdxRequestData: SDXAccessRequest,
  transaction?: Transaction,
) => {
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
