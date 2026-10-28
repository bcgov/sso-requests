import { cleanUpDatabaseTables } from './helpers/utils';
import { SSO_TEAM_IDIR_EMAIL, SSO_TEAM_IDIR_USER } from './helpers/fixtures';
import { getAuthenticatedUser, updateProfile } from './helpers/modules/users';
import { createMockAuth } from './mocks/authenticate';
import { models } from '@app/shared/sequelize/models/models';
import { EVENTS } from '@app/shared/enums';

jest.mock('@app/keycloak/integration', () => {
  const original = jest.requireActual('@app/keycloak/integration');
  return {
    ...original,
    keycloakClient: jest.fn(() => Promise.resolve(true)),
  };
});

describe('User Profile', () => {
  beforeEach(() => {
    createMockAuth(SSO_TEAM_IDIR_USER, SSO_TEAM_IDIR_EMAIL);
  });

  afterAll(async () => {
    await cleanUpDatabaseTables();
  });

  it('includes survey submissions in the profile defaulted to null', async () => {
    const result = await getAuthenticatedUser();
    expect(result.status).toBe(200);
    expect(result.body.surveySubmissions).toBe(null);
  });

  it('accepts updates to survey submissions when updating the profile', async () => {
    const newSubmissions = {
      addUserToRole: true,
      createRole: true,
      createIntegration: false,
      cssApiRequest: false,
      viewMetrics: false,
      downloadLogs: false,
    };

    const updateResult = await updateProfile({
      role: 'member',
      idirEmail: SSO_TEAM_IDIR_EMAIL,
      surveySubmissions: newSubmissions,
    });

    expect(updateResult.status).toBe(200);
    const getResult = await getAuthenticatedUser();
    expect(getResult.body.surveySubmissions).toMatchObject(newSubmissions);
    const event = await models.event.findOne({
      where: { eventCode: EVENTS.USER_PROFILE_UPDATE_SUCCESS },
      order: [['createdAt', 'desc']],
    });
    expect(event.details.changes.surveySubmissions.after).toMatchObject(newSubmissions);
    expect(event.actorType).toBe('user');
  });

  it('rolls back a profile update when its audit event cannot be written', async () => {
    const createEvent = jest.spyOn(models.event, 'create').mockRejectedValueOnce(new Error('audit insert failed'));

    const updateResult = await updateProfile({
      role: 'member',
      idirEmail: SSO_TEAM_IDIR_EMAIL,
      additionalEmail: 'new-contact@example.com',
    });

    expect(updateResult.status).not.toBe(200);
    const getResult = await getAuthenticatedUser();
    expect(getResult.body.additionalEmail).toBe(null);
    createEvent.mockRestore();
  });
});
