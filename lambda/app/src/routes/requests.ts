import { models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { kebabCase, omit } from 'lodash';
import { prepareRequest, validateRequest, processRequest } from '../helpers';

const AWS = require('aws-sdk');

const errorResponse = (err: any) => {
  console.error(err);
  return {
    statusCode: 422,
    body: JSON.stringify(err),
  };
};

const unauthorized = () => {
  return {
    statusCode: 401,
    body: JSON.stringify('unauthorized request'),
  };
};

export const createRequest = async (session: Session, data: Data) => {
  try {
    const { projectName, projectLead, preferredEmail, newToSso, publicAccess } = data;
    const result = await models.request.create({
      idirUserid: session.idir_userid,
      projectName,
      projectLead,
      preferredEmail,
      newToSso,
      publicAccess,
    });
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const updateRequest = async (session: Session, data: Data, submit: string | undefined) => {
  try {
    const { id, ...rest } = data;
    const original = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id,
      },
    });

    if (!original) {
      return unauthorized();
    }

    if (!['draft', 'applied'].includes(original.dataValues.status)) {
      return unauthorized();
    }

    const preparedRequest = prepareRequest(rest, processRequest(original.dataValues));
    const allowedData = omit(preparedRequest, ['idirUserid', 'projectLead', 'clientName', 'status']);

    if (submit) {
      const formData = processRequest(preparedRequest);
      const isValid = validateRequest({ ...formData, projectLead: preparedRequest.projectLead });
      if (isValid !== true) return errorResponse({ ...isValid, prepared: preparedRequest });
      allowedData.clientName = `${kebabCase(allowedData.projectName)}-${id}`;
      allowedData.status = 'submitted';
    }

    const result = await models.request.update(allowedData, {
      where: { id },
      returning: true,
      plain: true,
    });

    if (result.length < 2) {
      return errorResponse('update failed');
    }

    const updatedRequest = result[1].dataValues;

    if (submit) {
      const payload = JSON.stringify({
        requestId: updatedRequest.id,
        clientName: updatedRequest.clientName,
        realmName: updatedRequest.realm,
        validRedirectUris: updatedRequest.validRedirectUris,
        environments: updatedRequest.environments,
        publicAccess: updatedRequest.publicAccess,
      });

      await invokeGithubLambda(payload);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(updatedRequest),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const getRequest = async (session: Session, data: { requestId: number }) => {
  try {
    const request = await models.request.findOne({
      where: {
        idirUserid: session.idir_userid,
        id: data.requestId,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(request),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

export const getRequests = async (session: Session) => {
  try {
    const requests = await models.request.findAll({
      where: {
        idirUserid: session.idir_userid,
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify(requests),
    };
  } catch (err) {
    return errorResponse(err);
  }
};

const invokeGithubLambda = async (payload: string) => {
  const lambda = new AWS.Lambda({
    region: 'ca-central-1',
  });

  console.log('invoking lambda-github', payload);

  await lambda.invoke(
    {
      FunctionName: 'lambda-github',
      Payload: payload,
    },
    function (err) {
      if (err) {
        console.error(err);
      }
    },
  );
};
