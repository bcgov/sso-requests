import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { sequelize, models, modelNames } from '@lambda-shared/sequelize/models/models';
import { handler as appHandler } from '@lambda-app/main';
import { getMembersOnTeam } from '@lambda-app/queries/team';
import { handler as actionsHandler } from '@lambda-actions/main';
import baseEvent from '../base-event.json';

const { path: baseUrl } = baseEvent;
const actionsBaseUrl = '/actions';
const context = null;

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
    serviceType: 'gold',
    projectName: 'myproject',
    projectLead: true,
    usesTeam: false,
    teamId: null,
    apiServiceAccount: false,
  };
  createResponse: Response;
  teamResponse: Response;
  submitResponse: Response;
  deleteResponse: Response;
  serviceAccountResponse: Response;

  int: any;
  team: any;
  serviceAccount: any;
  teamUsers: any[];
  firstTeamMember: any;

  async create(args: { bceid?: boolean; github?: boolean; prod?: boolean; usesTeam?: boolean; serviceType?: string }) {
    const { bceid = false, github = false, prod = false, usesTeam = false } = args;

    if (usesTeam) await this.createTeam();

    const environments = ['dev', 'test'];
    if (prod) environments.push('prod');

    const devIdps = ['idir'];
    if (bceid) devIdps.push('bceidbasic');
    if (github) devIdps.push('githubbcgov');

    if (args.serviceType) this.current.serviceType = args.serviceType;

    const otherData = {
      publicAccess: false,
      devIdps,
      environments,
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
    this.int = this.createResponse.data;

    Object.assign(this.current, this.createResponse.data, otherData);

    return this.createResponse;
  }

  set(data: any) {
    Object.assign(this.current, data);
    return this.current;
  }

  async createTeam() {
    const teamData: any = {
      name: 'mytestteam',
      members: [{ idirEmail: TEST_IDIR_EMAIL_2, role: 'member' }],
    };

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams`,
      httpMethod: 'POST',
      body: JSON.stringify(teamData),
    };

    const { statusCode, body } = await appHandler(event, context);
    this.teamResponse = { statusCode, data: JSON.parse(body) };
    this.team = this.teamResponse.data;
    this.current.teamId = String(this.team.id);
    this.current.usesTeam = true;

    await sequelize.query(`UPDATE users_teams SET pending=false`);
    this.teamUsers = await getMembersOnTeam(this.current.teamId, { raw: true });
    this.firstTeamMember = this.teamUsers.find((member) => member.role === 'member');

    return this.teamResponse;
  }

  async removeMember() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams/${this.current.teamId}/members/${this.firstTeamMember.id}`,
      httpMethod: 'DELETE',
    };

    const { statusCode, body } = await appHandler(event, context);
    return { statusCode, data: JSON.parse(body) };
  }

  async removeTeam() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams/${this.current.teamId}`,
      httpMethod: 'DELETE',
    };

    const { statusCode, body } = await appHandler(event, context);
    return { statusCode, data: JSON.parse(body) };
  }

  async submit() {
    if (this.current.usesTeam) this.current.teamId = String(this.current.teamId);

    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/requests`,
      httpMethod: 'PUT',
      body: JSON.stringify(this.current),
      queryStringParameters: { submit: 'true' },
    };

    const { statusCode, body } = await appHandler(event, context);
    this.submitResponse = { statusCode, data: JSON.parse(body) };

    return this.submitResponse;
  }

  async delete() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/requests`,
      httpMethod: 'DELETE',
      queryStringParameters: { id: this.current.id },
    };

    const { statusCode, body } = await appHandler(event, context);
    this.deleteResponse = { statusCode, data: JSON.parse(body) };

    return this.deleteResponse;
  }

  async prSuccess(prNumber: number) {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${actionsBaseUrl}/batch/pr`,
      httpMethod: 'PUT',
      body: JSON.stringify({
        id: this.current.id,
        actionNumber: prNumber,
        prNumber,
        success: true,
        isEmpty: false,
        isAllowedToMerge: false,
        changes: {},
      }),
    };

    // TBD: once actions lambda is wrapped within Expressy, add more checks
    await actionsHandler(event, context);
  }

  async applySuccess() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${actionsBaseUrl}/batch/items`,
      httpMethod: 'PUT',
      body: JSON.stringify({
        ids: [this.current.id],
        success: true,
      }),
    };

    // TBD: once actions lambda is wrapped within Expressy, add more checks
    await actionsHandler(event, context);
  }

  async success() {
    prNumber = prNumber + 1;
    await this.prSuccess(prNumber);
    await this.applySuccess();
  }

  async createServiceAccount() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams/${this.current.teamId}/service-accounts`,
      httpMethod: 'POST',
    };

    const { statusCode, body } = await appHandler(event, context);
    this.serviceAccountResponse = { statusCode, data: JSON.parse(body) };
    this.serviceAccount = this.serviceAccountResponse.data;
    return this.serviceAccountResponse;
  }

  async deleteServiceAccount() {
    const event: APIGatewayProxyEvent = {
      ...baseEvent,
      path: `${baseUrl}/teams/${this.current.teamId}/service-accounts/${this.serviceAccount.id}`,
      httpMethod: 'DELETE',
    };

    const { statusCode, body } = await appHandler(event, context);
    return { statusCode, data: JSON.parse(body) };
  }
}
