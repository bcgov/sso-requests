import { createMockAuth } from './mocks/authenticate';
import { TEAM_ADMIN_IDIR_EMAIL_01, TEAM_ADMIN_IDIR_USERID_01 } from './helpers/fixtures';
import {
  importAzureIdirUser,
  importIdirUser,
  searchAzureIdirUsers,
  searchAzureIdirUsersByEmail,
  searchIdirUsers,
} from './helpers/modules/users';
import { searchIdirEmail } from '@app/utils/graph-api';
import axios from 'axios';

const AZURE_RESPONSE = ['some.user@email.com'];

jest.mock('@app/utils/graph-api', () => {
  const originalModule = jest.requireActual('@app/utils/graph-api');
  return {
    __esModule: true,
    ...originalModule,
    getAzureAccessToken: jest.fn(() => Promise.resolve('mocked-access-token')),
    searchIdirEmail: jest.fn(() => Promise.resolve(AZURE_RESPONSE)),
  };
});

// callAzureGraphApi and getAzureAccessToken call each other from within the same module, so
// mocking their exports (above/via spyOn) can't intercept those internal calls. Mock the actual
// dependencies they use (axios and MSAL) instead.
jest.mock('axios');

jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenByClientCredential: jest.fn(() =>
      Promise.resolve({ accessToken: 'mocked-access-token', expiresOn: new Date(Date.now() + 3600_000) }),
    ),
  })),
}));

// mock easy-soap-request to send back a xml response that contains 2 users for the searchIdirUsers test
jest.mock('easy-soap-request', () => {
  return jest.fn(() =>
    Promise.resolve({
      response: {
        body: `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Body>
          <searchInternalAccountResponse xmlns="http://tempuri.org/">
            <searchInternalAccountResult>
              <code>Success</code>
              <accountList>
                <BCeIDAccount>
                  <guid><value>1234</value></guid>
                  <userId><value>idirUser1</value></userId>
                  <displayName><value>Idir User 1</value></displayName>
                  <contact><email><value>idiruser1@email.com</value></email></contact>
                  <individualIdentity>
                  <name>
                    <firstname><value>idir</value></firstname>
                    <surname><value>user1</value></surname>
                  </name>
                  </individualIdentity>
                </BCeIDAccount>
                <BCeIDAccount>
                  <guid><value>5678</value></guid>
                  <userId><value>idirUser2</value></userId>
                  <displayName><value>Idir User 2</value></displayName>
                  <contact><email><value>idiruser2@email.com</value></email></contact>
                  <individualIdentity>
                    <name>
                      <firstname><value>idir</value></firstname>
                      <surname><value>user2</value></surname>
                    </name>
                  </individualIdentity>
                </BCeIDAccount>
              </accountList>
            </searchInternalAccountResult>
          </searchInternalAccountResponse>
        </soap:Body>
      </soap:Envelope>`,
      },
    }),
  );
});

jest.mock('@app/keycloak/users', () => {
  return {
    createIdirUser: jest.fn(() => Promise.resolve(true)),
    createAzureIdirUser: jest.fn(() => Promise.resolve(true)),
  };
});

describe('User Search', () => {
  it('Requires Authentication', async () => {
    const result = await searchAzureIdirUsersByEmail('hi');
    expect(result.status).toBe(401);
  });

  it('Passes in the query param and returns the results', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await searchAzureIdirUsersByEmail('email');
    expect(result.status).toBe(200);
    expect(searchIdirEmail).toHaveBeenCalledWith('email');
    expect(result.body).toEqual(AZURE_RESPONSE);
  });

  it('Returns error code when MS API fails', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    (searchIdirEmail as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('failure')));
    const result = await searchAzureIdirUsersByEmail('email');
    expect(result.status).toBe(422);
  });
});

describe('should allow searching and importing idir users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error upon searching users with invalid fields', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await searchIdirUsers('invalidField', 'search');
    expect(result.status).toBe(422);
  });

  it('should return idir search results', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await searchIdirUsers('email', 'search');
    expect(result.status).toBe(200);
    expect(result.body.length).toEqual(2);
  });

  it('should throw error upon importing users with missing data', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await importIdirUser({ guid: '1234', userId: 'idirUser1' });
    expect(result.status).toBe(422);
  });

  it('should import user successfully', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const userData = {
      guid: '1234',
      idirUsername: 'idirUser1',
      email: 'idiruser1@email.com',
      firstName: 'idir',
      lastName: 'user1',
      displayName: 'Idir User 1',
    };
    const importResult = await importIdirUser(userData);
    expect(importResult.status).toBe(200);
  });
});

describe('should allow searching and importing azure idir users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should throw error upon searching users with invalid fields', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await searchAzureIdirUsers('invalidField', 'search');
    expect(result.status).toBe(422);
  });

  it('should return idir search results', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    (axios.request as jest.Mock).mockResolvedValueOnce({
      data: {
        value: [
          {
            onPremisesExtensionAttributes: { extensionAttribute12: '1234' },
            mailNickname: 'idirUser1',
            displayName: 'Idir User 1',
            mail: 'idiruser1@email.com',
            jobTitle: 'Developer',
            givenName: 'idir',
            surname: 'user1',
            companyName: 'Company A',
            department: 'IT',
            mobilePhone: '123-456-7890',
            userPrincipalName: 'IDIRUSER1',
          },
          {
            onPremisesExtensionAttributes: { extensionAttribute12: '5678' },
            mailNickname: 'idirUser2',
            displayName: 'Idir User 2',
            mail: 'idiruser2@email.com',
            jobTitle: 'Manager',
            givenName: 'idir',
            surname: 'user2',
            companyName: 'Company B',
            department: 'HR',
            mobilePhone: '987-654-3210',
            userPrincipalName: 'IDIRUSER2',
          },
        ],
      },
    });
    const result = await searchAzureIdirUsers('mail', 'search');
    expect(result.status).toBe(200);
    expect(result.body.length).toEqual(2);
  });

  it('should throw error upon importing users with missing data', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    const result = await importAzureIdirUser({ invalidField: '1234', userId: 'idirUser1' });
    expect(result.status).toBe(422);
  });

  it('should import user successfully', async () => {
    createMockAuth(TEAM_ADMIN_IDIR_USERID_01, TEAM_ADMIN_IDIR_EMAIL_01);
    (axios.request as jest.Mock).mockResolvedValueOnce({
      data: {
        value: [
          {
            onPremisesExtensionAttributes: { extensionAttribute12: '1234' },
            mailNickname: 'idirUser1',
            displayName: 'Idir User 1',
            mail: 'idiruser1@email.com',
            jobTitle: 'Developer',
            givenName: 'idir',
            surname: 'user1',
            companyName: 'Company A',
            department: 'IT',
            mobilePhone: '123-456-7890',
            userPrincipalName: 'IDIRUSER1',
          },
        ],
      },
    });
    const userData = {
      guid: '1234',
      userId: 'idirUser1',
    };
    const importResult = await importAzureIdirUser(userData);
    expect(importResult.status).toBe(200);
  });
});
