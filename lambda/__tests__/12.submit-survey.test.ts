import app from './helpers/server';
import supertest from 'supertest';
import { APP_BASE_PATH } from './helpers/constants';
import { cleanUpDatabaseTables, createMockAuth, createMockSendEmail } from './helpers/utils';
import { SSO_TEAM_IDIR_EMAIL, SSO_TEAM_IDIR_USER } from './helpers/fixtures';
import { models } from '@lambda-shared/sequelize/models/models';

const surveyData = {
  rating: 1,
  message: 'test message',
  triggerEvent: 'addUserToRole',
};

jest.mock('../app/src/authenticate');
jest.mock('../shared/utils/ches', () => {
  return {
    sendEmail: jest.fn(),
  };
});

jest.mock('@lambda-app/github', () => {
  return {
    dispatchRequestWorkflow: jest.fn(() => true),
  };
});

describe('Submit Survey', () => {
  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('requires authentication', async () => {
    const result = await supertest(app)
      .post(`${APP_BASE_PATH}/surveys`)
      .send(surveyData)
      .set('Accept', 'application/json');
    expect(result.status).toBe(401);
  });

  it('returns 422 if missing required data', async () => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
    const result = await supertest(app).post(`${APP_BASE_PATH}/surveys`).send({}).set('Accept', 'application/json');
    expect(result.status).toBe(422);
  });

  it('Saves survey result and returns 200 if all required data is provided', async () => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
    const result = await supertest(app)
      .post(`${APP_BASE_PATH}/surveys`)
      .send(surveyData)
      .set('Accept', 'application/json');
    expect(result.status).toBe(200);

    const survey = await models.survey.findOne({ where: { message: 'test message' } });
    expect(survey).not.toBeNull();
  });

  it('sends an email to the user and CCs the SSO team when a survey is submitted', async () => {
    const userEmail = 'public.user@mail.com';
    createMockAuth(SSO_TEAM_IDIR_USER, userEmail);
    const emailList = createMockSendEmail();
    await supertest(app).post(`${APP_BASE_PATH}/surveys`).send(surveyData).set('Accept', 'application/json');
    expect(emailList.length).toBe(1);
    expect(emailList.find((email) => email.to.includes(userEmail))).toBeDefined();
    expect(emailList.find((email) => email.cc.includes(SSO_TEAM_IDIR_EMAIL))).toBeDefined();
  });
});
