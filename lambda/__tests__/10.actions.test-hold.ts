import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../actions/src/main';
import baseEvent from './base-event.json';
import { models } from '../shared/sequelize/models/models';
import { mergePR } from '../actions/src/github';

const { path: baseUrl } = baseEvent;

jest.mock('../actions/src/github', () => {
  return {
    mergePR: jest.fn(),
  };
});

jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

let id;
let wakeUpEvent: APIGatewayProxyEvent = {
  ...baseEvent,
  path: `${baseUrl}/actions`,
  queryStringParameters: { status: 'create' },
  body: JSON.stringify({
    prNumber: 1,
    prSuccess: true,
    planSuccess: true,
    applySuccess: true,
    actionNumber: 1,
    planDetails: null,
    repoOwner: 'test',
    repoName: 'test',
  }),
  headers: {
    Authorization: 'test',
  },
};

let updateEvent: APIGatewayProxyEvent = {
  ...wakeUpEvent,
  requestContext: { httpMethod: 'PUT' },
};

let planEvent: APIGatewayProxyEvent = { ...updateEvent, queryStringParameters: { status: 'plan' } };
let applyEvent: APIGatewayProxyEvent = { ...updateEvent, queryStringParameters: { status: 'apply' } };

const changeBody = (event: APIGatewayProxyEvent, key: string, value: any) => {
  return { ...event, body: JSON.stringify({ ...JSON.parse(event.body), [key]: value }) };
};

beforeAll(async () => {
  await models.request.destroy({ where: { idirUserid: 'A1' } });
  const request = await models.request.create({
    idirUserid: 'A1',
    projectName: 'test',
    projectLead: true,
    publicAccess: 'yes',
  });
  id = request.dataValues.id;
  wakeUpEvent = changeBody(wakeUpEvent, 'id', request.dataValues.id);
  updateEvent = changeBody(updateEvent, 'id', request.dataValues.id);
  planEvent = changeBody(planEvent, 'id', request.dataValues.id);
  applyEvent = changeBody(applyEvent, 'id', request.dataValues.id);
});

describe('actions endpoints', () => {
  afterEach(() => {
    models.event.destroy({
      where: {},
    });

    jest.clearAllMocks();
  });

  const context: Context = {};

  it('should successfully wake up the API on GET requests', async () => {
    const event: APIGatewayProxyEvent = { ...wakeUpEvent, path: `${baseUrl}/actions` };

    return await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
  });

  it('should update the pr number and status of a request after creating a pull request and save the event', async () => {
    await new Promise((resolve, reject) => {
      handler(updateEvent, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });

    const request = await models.request.findOne({ where: { id } });

    expect(request.prNumber).toBe(1);
    expect(request.status).toBe('pr');

    const prEvent = await models.event.findOne({ where: { requestId: id } });
    expect(prEvent.eventCode).toBe('request-pr-success');
  });

  it('should create a prFailed event if pr was unsuccessful', async () => {
    const event: APIGatewayProxyEvent = changeBody(
      {
        ...updateEvent,
      },
      'prSuccess',
      false,
    );

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
    const prEvent = await models.event.findOne({ where: { requestId: id } });
    expect(prEvent.eventCode).toBe('request-pr-failure');
    expect(mergePR).not.toHaveBeenCalled();
  });

  it('should update the status when terraform plan is successful, save the event, and merge the PR', async () => {
    const mergablePlanEvent = changeBody(planEvent, 'isAllowedToMerge', true);
    await new Promise((resolve, reject) => {
      handler(mergablePlanEvent, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });

    const request = await models.request.findOne({ where: { id } });
    expect(request.status).toBe('planned');

    const savedPlanEvent = await models.event.findOne({ where: { requestId: id } });
    expect(savedPlanEvent.eventCode).toBe('request-plan-success');
    expect(mergePR).toHaveBeenCalled();
  });

  it('should create a planFailed event if the plan is unsuccessful and not merge the pr', async () => {
    const event: APIGatewayProxyEvent = changeBody(planEvent, 'planSuccess', false);

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
    const savedPlanEvent = await models.event.findOne({ where: { requestId: id } });
    expect(savedPlanEvent.eventCode).toBe('request-plan-failure');
    expect(mergePR).not.toHaveBeenCalled();
  });

  it('should update the status when terraform apply is successful and save the event', async () => {
    await new Promise((resolve, reject) => {
      handler(applyEvent, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });

    const request = await models.request.findOne({ where: { id } });
    expect(request.status).toBe('applied');

    const savedApplyEvent = await models.event.findOne({ where: { requestId: id } });
    expect(savedApplyEvent.eventCode).toBe('request-apply-success');
  });

  it('should create an applyFailed event if the apply is unsuccessful', async () => {
    const event: APIGatewayProxyEvent = changeBody(applyEvent, 'applySuccess', false);

    await new Promise((resolve, reject) => {
      handler(event, context, (error, response) => {
        expect(response.statusCode).toEqual(200);
        resolve(true);
      });
    });
    const savedApplyEvent = await models.event.findOne({ where: { requestId: id } });
    expect(savedApplyEvent.eventCode).toBe('request-apply-failure');
  });

  it('should return a 401 if unauthorized', async () => {
    const unauthorizedEvent: APIGatewayProxyEvent = { ...baseEvent, headers: { Authorization: 'wrong' } };

    await new Promise((resolve, reject) => {
      handler(unauthorizedEvent, context, (error, response) => {
        expect(response.statusCode).toEqual(401);
        resolve(true);
      });
    });
  });
});
