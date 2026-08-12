import type { Session } from '@app/shared/interfaces';
import { sequelize, models } from '@app/shared/sequelize/models/models';
import { SDXResourceServer } from '@app/shared/interfaces';
import { getAllowedRequest } from '@app/queries/request';

export const getSdxServicesForClient = async (
  session: Session,
  requestId: number,
  status: string,
): Promise<{ clientId: string; resourceServers: SDXResourceServer[] }> => {
  const current = await getAllowedRequest(session, requestId);
  if (!current) throw new Error('Request not found');

  // if (status === 'approved') {
  //   return {
  //     clientId: current.clientId,
  //     resourceServers: [
  //       {
  //         id: 'claims',
  //         environment: 'non-production',
  //         services: [
  //           {
  //             id: 'phn-lookup',
  //             versions: [
  //               {
  //                 label: 'v2',
  //                 scopes: ['hlth:HealthNumber.read'],
  //               },
  //             ],
  //           },
  //           {
  //             id: 'data-usage-api',
  //             versions: [
  //               {
  //                 label: 'v1',
  //                 scopes: ['hlth:DataAccessRequestsCount.read'],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     ],
  //   };
  // } else if (status === 'pending') {
  //   return {
  //     clientId: current.clientId,
  //     resourceServers: [
  //       {
  //         id: 'claims',
  //         environment: 'non-production',
  //         services: [
  //           {
  //             id: 'phn-lookup',
  //             versions: [
  //               {
  //                 label: 'v2',
  //                 status: 'Current',
  //                 scopes: ['hlth:HealthNumber.write'],
  //               },
  //             ],
  //           },
  //           {
  //             id: 'data-usage-api',
  //             versions: [
  //               {
  //                 label: 'v1',
  //                 status: 'Current',
  //                 scopes: ['hlth:DataAccessRequestsCount.write'],
  //               },
  //             ],
  //           },
  //         ],
  //       },
  //     ],
  //   };
  // } else {
  //   throw new Error('Invalid status');
  // }

  return {
    clientId: current.clientId,
    resourceServers: [],
  };
};

export const listSdxResourceServers = (session: Session): SDXResourceServer[] => {
  return [
    {
      id: 'claims',
      name: 'Claims',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to health-related claims.',
      environment: 'non-production',
      services: [
        {
          id: 'phn-lookup',
          name: 'PHN Lookup API',
          description: 'API for looking up Personal Health Numbers (PHNs).',
          versions: [
            {
              label: 'v2',
              status: 'Current',
              scopes: [
                {
                  label: 'hlth:HealthNumber.read',
                  description: 'Read health number',
                },
                {
                  label: 'hlth:HealthNumber.write',
                  description: 'Write health number',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'data-usage',
      name: 'Data Usage',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to data usage metrics.',
      environment: 'non-production',
      services: [
        {
          id: 'data-usage-api',
          name: 'Data Usage API',
          description: 'API for accessing data usage metrics.',
          versions: [
            {
              label: 'v1',
              status: 'Current',
              scopes: [
                {
                  label: 'hlth:DataAccessRequestsCount.read',
                  description: 'List data access requests and read their count.',
                },
                {
                  label: 'hlth:DataAccessRequestsCount.write',
                  description: 'Create data access requests and update their count.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'student-records',
      name: 'Student Records',
      organization: 'Ministry of Education',
      description: 'This resource server provides access to student records.',
      environment: 'non-production',
      services: [
        {
          id: 'student-records-api',
          name: 'Student Records API',
          description: 'API for accessing student records.',
          versions: [
            {
              label: 'v1',
              status: 'Current',
              scopes: [
                {
                  label: 'edu:StudentRecords.read',
                  description: 'Read student records.',
                },
                {
                  label: 'edu:StudentRecords.write',
                  description: 'Write student records.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'claims',
      name: 'Claims',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to health-related claims.',
      environment: 'production',
      services: [
        {
          id: 'phn-lookup',
          name: 'PHN Lookup API',
          description: 'API for looking up Personal Health Numbers (PHNs).',
          versions: [
            {
              label: 'v2',
              status: 'Current',
              scopes: [
                {
                  label: 'hlth:HealthNumber.read',
                  description: 'Read health number',
                },
                {
                  label: 'hlth:HealthNumber.write',
                  description: 'Write health number',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'data-usage',
      name: 'Data Usage',
      organization: 'Ministry of Health',
      description: 'This resource server provides access to data usage metrics.',
      environment: 'production',
      services: [
        {
          id: 'data-usage-api',
          name: 'Data Usage API',
          description: 'API for accessing data usage metrics.',
          versions: [
            {
              label: 'v1',
              status: 'Current',
              scopes: [
                {
                  label: 'hlth:DataAccessRequestsCount.read',
                  description: 'List data access requests and read their count.',
                },
                {
                  label: 'hlth:DataAccessRequestsCount.write',
                  description: 'Create data access requests and update their count.',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'student-records',
      name: 'Student Records',
      organization: 'Ministry of Education',
      description: 'This resource server provides access to student records.',
      environment: 'production',
      services: [
        {
          id: 'student-records-api',
          name: 'Student Records API',
          description: 'API for accessing student records.',
          versions: [
            {
              label: 'v1',
              status: 'Current',
              scopes: [
                {
                  label: 'edu:StudentRecords.read',
                  description: 'Read student records.',
                },
                {
                  label: 'edu:StudentRecords.write',
                  description: 'Write student records.',
                },
              ],
            },
          ],
        },
      ],
    },
  ];
};

export const createSdxRequest = async (session: Session, requestId: number, requester: string, sdxRequestData: any) => {
  const transaction = await sequelize.transaction();

  try {
    const submissionId = require('uuid').v4();
    await models.SdxRequest.create(
      { request_id: requestId, submission_id: submissionId, requester, access_request: sdxRequestData },
      { transaction },
    );

    // const result = await fetch(`${process.env.SDX_API_URL}/integrations/claims/access-requests`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     Authorization: `Bearer ${session.bearerToken}`,
    //   },
    //   body: JSON.stringify(sdxRequestData),
    // });

    // if (!result.ok) {
    //   throw new Error(`Failed to create SDX request in external API: ${result.statusText}`);
    // }

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  return {
    success: true,
    message: 'SDX request created successfully',
    data: {
      requestId,
      ...sdxRequestData,
    },
  };
};
