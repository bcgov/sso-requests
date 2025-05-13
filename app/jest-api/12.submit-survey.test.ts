import { cleanUpDatabaseTables } from './helpers/utils';
import { SSO_TEAM_IDIR_EMAIL, SSO_TEAM_IDIR_USER } from './helpers/fixtures';
import { models } from '@app/shared/sequelize/models/models';
import { createSurvey } from './helpers/modules/surveys';
import { createMockAuth } from './mocks/authenticate';
import { createMockSendEmail } from './mocks/mail';

const surveyData = {
  rating: 1,
  message: 'test message',
  triggerEvent: 'addUserToRole',
};

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('Submit Survey', () => {
  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('requires authentication', async () => {
    const result = await createSurvey(surveyData);
    expect(result.status).toBe(401);
  });

  it('returns 422 if missing required data', async () => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
    const result = await createSurvey({} as any);
    expect(result.status).toBe(422);
  });

  it('Saves survey result and returns 200 if all required data is provided', async () => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
    const result = await createSurvey(surveyData);
    expect(result.status).toBe(200);
    const survey = await models.survey.findOne({ where: { message: 'test message' } });
    expect(survey).not.toBeNull();
  });

  it('sends an email to the user and CCs the SSO team when a survey is submitted', async () => {
    const userEmail = 'public.user@mail.com';
    createMockAuth(SSO_TEAM_IDIR_USER, userEmail);
    const emailList = createMockSendEmail();
    await createSurvey(surveyData);
    expect(emailList.length).toBe(1);
    expect(emailList.find((email: any) => email.to.includes(userEmail))).toBeDefined();
    expect(emailList.find((email: any) => email.cc.includes(SSO_TEAM_IDIR_EMAIL))).toBeDefined();
  });
});
