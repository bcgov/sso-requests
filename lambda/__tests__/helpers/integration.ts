import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { sequelize, models, modelNames } from '@lambda-shared/sequelize/models/models';
import { handler as appHandler } from '@lambda-app/main';
import { handler as actionsHandler } from '@lambda-actions/main';
import baseEvent from '../base-event.json';

const { path: baseUrl } = baseEvent;
const actionsBaseUrl = '/actions';
const context: Context = {};

export const TEST_IDIR_USERID = 'AABBCCDDEEFFGG';
export const TEST_IDIR_USERID_2 = 'AABBCCDDEEFFGGHH';
export const TEST_IDIR_EMAIL = 'testuser@example.com';
export const TEST_IDIR_EMAIL_2 = 'testuser2@example.com';

interface Response {
  statusCode: number;
  data: any;
}

let prNumber = 0;

export class Integration {
  current: any = {
    projectName: 'myproject',
    projectLead: true,
    usesTeam: false,
    teamId: null,
  };
  createResponse: Response;
  teamResponse: Response;
  submitResponse: Response;

  async create(args: { bceid?: boolean; prod?: boolean; usesTeam?: boolean }) {
    const { bceid = false, prod = false, usesTeam = false } = args;

    if (usesTeam) await this.createTeam();

    const otherData = {
      realm: `onestopauth${bceid ? '-basic' : ''}`,
      publicAccess: false,
      dev: true,
      test: true,
      prod,
      devValidRedirectUris: ['https://a'],
      testValidRedirectUris: ['https://a'],
      prodValidRedirectUris: prod ? ['https://a'] : [],
      agreeWithTerms: true,
    };

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/requests`,
      httpMethod: 'POST',
      body: JSON.stringify(this.current),
    };

    const { statusCode, body } = await appHandler(event, context);
    this.createResponse = { statusCode, data: JSON.parse(body) };

    Object.assign(this.current, this.createResponse.data, otherData);

    return this.createResponse;
  }

  async createTeam() {
    const teamData: any = {
      name: 'mytestteam',
      members: [{ idirEmail: [TEST_IDIR_EMAIL_2], role: 'member' }],
    };

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams`,
      httpMethod: 'POST',
      body: JSON.stringify(teamData),
    };

    const { statusCode, body } = await appHandler(event, context);
    this.teamResponse = { statusCode, data: JSON.parse(body) };
    this.current.teamId = String(this.teamResponse.data.id);
    this.current.usesTeam = true;

    await sequelize.query(`UPDATE users_teams SET pending=false`);

    return this.teamResponse;
  }

  async submit() {
    if (this.current.usesTeam) this.current.teamId = String(this.current.teamId);

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/requests`,
      httpMethod: 'PUT',
      body: JSON.stringify(this.current),
      queryStringParameters: { submit: true },
    };

    const { statusCode, body } = await appHandler(event, context);
    this.submitResponse = { statusCode, data: JSON.parse(body) };

    return this.submitResponse;
  }

  async prSuccess(prNumber: number) {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${actionsBaseUrl}`,
      httpMethod: 'PUT',
      requestContext: { httpMethod: 'PUT' },
      body: JSON.stringify({
        id: this.current.id,
        actionNumber: prNumber,
        prNumber,
        prSuccess: true,
      }),
      queryStringParameters: { status: 'create' },
    };

    // TBD: once actions lambda is wrapped within Expressy, add more checks
    await actionsHandler(event, context, () => {});
  }

  async applySuccess(prNumber: number) {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${actionsBaseUrl}`,
      httpMethod: 'PUT',
      requestContext: { httpMethod: 'PUT' },
      body: JSON.stringify({
        id: this.current.id,
        prNumber,
        applySuccess: true,
      }),
      queryStringParameters: { status: 'apply' },
    };

    // TBD: once actions lambda is wrapped within Expressy, add more checks
    await actionsHandler(event, context, () => {});
  }

  async success() {
    prNumber = prNumber + 1;
    await this.prSuccess(prNumber);
    await this.applySuccess(prNumber);
  }
}
