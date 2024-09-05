import { formDataDev } from './helpers/fixtures';
import { createBCSCClient, updateBCSCClient } from '@lambda-app/bcsc/client';
import { getPrivacyZones } from '@lambda-app/controllers/bc-services-card';
import axios from 'axios';

jest.mock('@lambda-app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() => Promise.resolve([{ privacy_zone_uri: 'zone', privacy_zone_name: 'zone' }])),
  };
});

jest.mock('@lambda-app/utils/helpers', () => {
  return {
    getBCSCEnvVars: jest.fn(() => {
      return {};
    }),
    getRequiredBCSCScopes: jest.fn(),
  };
});

describe('BCSC API Callouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const bcscData = { ...formDataDev, bcscAttributes: ['age'], bcscPrivacyZone: 'urn:ca:bc:gov:buseco:prod' };
  const bcscClient = {
    id: 1,
    clientId: 'a',
    clientName: 'a',
    clientUri: 'a',
    clientSecret: 'a',
    registrationAccessToken: 'a',
    environment: 'a',
  };

  it('Adds the sub claim when creating or updating a BCSC client', async () => {
    await createBCSCClient(bcscClient, bcscData, 1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    let [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];

    expect(axiosDataArg.claims.includes('sub')).toBeTruthy();
    const bcscJSONKeys = Object.keys(axiosDataArg);
    expect(bcscJSONKeys.includes('privacy_zone_uri')).toBeTruthy();

    jest.clearAllMocks();

    await updateBCSCClient(bcscClient, bcscData);
    expect(axios.put).toHaveBeenCalledTimes(1);
    [, axiosDataArg] = (axios.put as jest.Mock).mock.calls[0];
    expect(axiosDataArg.claims.includes('sub')).toBeTruthy();
  });

  it('Excludes privacy zone when updating a BCSC client', async () => {
    await updateBCSCClient(bcscClient, bcscData);
    expect(axios.put).toHaveBeenCalledTimes(1);
    const [, axiosDataArg] = (axios.put as jest.Mock).mock.calls[0];
    const bcscJSONKeys = Object.keys(axiosDataArg);

    expect(bcscJSONKeys.includes('claims')).toBeTruthy();
    expect(bcscJSONKeys.includes('privacy_zone_uri')).toBeFalsy();
  });

  it('Updates the privacy zone URI in production for dev and test clients', async () => {
    process.env.APP_ENV = 'production';
    await createBCSCClient({ ...bcscClient, environment: 'dev' }, bcscData, 1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    let [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:buseco:test');

    jest.clearAllMocks();

    await createBCSCClient({ ...bcscClient, environment: 'test' }, bcscData, 1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:buseco:test');
  });

  it('Keeps the privacy zone URI in production for prod clients', async () => {
    process.env.APP_ENV = 'production';
    await createBCSCClient({ ...bcscClient, environment: 'prod' }, bcscData, 1);
    expect(axios.post).toHaveBeenCalledTimes(1);
    let [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:buseco:prod');
  });

  it('Checks the API response for privacy zones for prod clients', async () => {
    process.env.APP_ENV = 'production';
    (getPrivacyZones as jest.Mock).mockImplementationOnce(
      jest.fn(() =>
        Promise.resolve([{ privacy_zone_name: 'zone', privacy_zone_uri: 'urn:ca:bc:gov:someministry:test' }]),
      ),
    );
    await createBCSCClient(
      { ...bcscClient, environment: 'test' },
      { ...bcscData, bcscPrivacyZone: 'urn:ca:bc:gov:someministry:prod' },
      1,
    );

    expect(axios.post).toHaveBeenCalledTimes(1);
    let [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:someministry:test');
  });

  it('Uses the base uri for other environments', async () => {
    process.env.APP_ENV = 'test';
    await createBCSCClient(
      { ...bcscClient, environment: 'test' },
      { ...bcscData, bcscPrivacyZone: 'urn:ca:bc:gov:someministry:prod' },
      1,
    );
    expect(axios.post).toHaveBeenCalledTimes(1);

    expect(getPrivacyZones).not.toHaveBeenCalled();

    let [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:someministry:prod');

    jest.clearAllMocks();

    process.env.APP_ENV = 'development';
    await createBCSCClient(
      { ...bcscClient, environment: 'test' },
      { ...bcscData, bcscPrivacyZone: 'urn:ca:bc:gov:someministry:prod' },
      1,
    );
    expect(axios.post).toHaveBeenCalledTimes(1);

    expect(getPrivacyZones).not.toHaveBeenCalled();

    [, axiosDataArg] = (axios.post as jest.Mock).mock.calls[0];
    expect(axiosDataArg.privacy_zone_uri).toBe('urn:ca:bc:gov:someministry:prod');
  });

  it('Throws an error if privacy zone cannot be found and skips creation api call', async () => {
    process.env.APP_ENV = 'production';
    await expect(
      createBCSCClient(
        { ...bcscClient, environment: 'test' },
        { ...bcscData, bcscPrivacyZone: 'urn:ca:bc:gov:dne' },
        1,
      ),
    ).rejects.toThrow('Privacy zone not found');
    expect(axios.post).not.toHaveBeenCalled();
  });
});
