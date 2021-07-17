import { models } from '../../../shared/sequelize/models/models';
import { Session, Data } from '../../../shared/interfaces';
import { formatFormData } from '../helpers';
const AWS = require('aws-sdk');

const handleError = (err: string) => {
  console.error(err);
  return {
    statusCode: 422,
  };
};

export const createRequest = async (session: Session, data: Data) => {
  const formattedFormData = formatFormData(data);
  try {
    const { projectName, projectLead, preferredEmail, newToSso } = formattedFormData;
    const result = await models.request.create({
      idirUserid: session.idir_userid,
      projectName,
      projectLead,
      preferredEmail,
      newToSso,
    });
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    handleError(err);
  }
};

export const updateRequest = async (session: Session, data: Data, submit: string | undefined) => {
  const formattedFormData = formatFormData(data);
  try {
    const { id, ...rest } = formattedFormData;
    const result = await models.request.update(
      {
        ...rest,
      },
      {
        where: { id },
      }
    );
    if (submit) {
      const payload = JSON.stringify(formattedFormData);
      await invokeGithubLambda(payload);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (err) {
    handleError(err);
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
    handleError(err);
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
    handleError(err);
  }
};

const invokeGithubLambda = async (payload: string) => {
  const lambda = new AWS.Lambda({
    region: 'ca-central-1',
  });

  await lambda.invoke(
    {
      FunctionName: 'lambda-github',
      Payload: payload,
    },
    function (err) {
      if (err) {
        console.error(err);
      }
    }
  );
};
