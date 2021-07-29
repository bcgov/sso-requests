import { models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { kebabCase, omit } from 'lodash';
import { validateRequest } from '../helpers';
import { dispatchRequestWorkflow } from '../github';

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

    const immutableFields = ['idirUserid', 'projectLead', 'clientName', 'status'];
    const allowedRequest = omit(rest, immutableFields);
    const mergedRequest = { ...original.dataValues, ...allowedRequest };

    if (submit) {
      const isValid = validateRequest(mergedRequest);
      if (isValid !== true) return errorResponse({ ...isValid, prepared: mergedRequest });
      allowedRequest.clientName = `${kebabCase(allowedRequest.projectName)}-${id}`;
      allowedRequest.status = 'submitted';
    }

    const result = await models.request.update(allowedRequest, {
      where: { id },
      returning: true,
      plain: true,
    });

    if (result.length < 2) {
      return errorResponse('update failed');
    }

    const updatedRequest = result[1].dataValues;

    if (submit) {
      const payload = {
        requestId: updatedRequest.id,
        clientName: updatedRequest.clientName,
        realmName: updatedRequest.realm,
        validRedirectUris: {
          dev: updatedRequest.devValidRedirectUris,
          test: updatedRequest.testValidRedirectUris,
          prod: updatedRequest.prodValidRedirectUris,
        },
        environments: updatedRequest.environments,
        publicAccess: updatedRequest.publicAccess,
      };

      await dispatchRequestWorkflow(payload);
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
