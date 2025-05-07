import { formDataDev } from './helpers/fixtures';
import { createBCSCClient, updateBCSCClient } from '@app/utils/bcsc-client';
import { getPrivacyZones } from '@app/controllers/bc-services-card';
import axios from 'axios';

jest.mock('@app/controllers/bc-services-card', () => {
  return {
    getPrivacyZones: jest.fn(() => Promise.resolve([{ privacy_zone_uri: 'zone', privacy_zone_name: 'zone' }])),
  };
});

jest.mock('@app/utils/helpers', () => {
  return {
    getBCSCEnvVars: jest.fn(() => {
      return {};
    }),
    getRequiredBCSCScopes: jest.fn(() => Promise.resolve([])),
  };
});

describe('BCSC API Callouts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const bcscData = { ...formDataDev, bcscAttributes: ['age'], bcscPrivacyZone: 'zone' };
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

  it('Includes privacy zone when updating a BCSC client', async () => {
    await updateBCSCClient(bcscClient, bcscData);
    expect(axios.put).toHaveBeenCalledTimes(1);
    const [, axiosDataArg] = (axios.put as jest.Mock).mock.calls[0];
    const bcscJSONKeys = Object.keys(axiosDataArg);

    expect(bcscJSONKeys.includes('claims')).toBeTruthy();
    expect(bcscJSONKeys.includes('privacy_zone_uri')).toBeTruthy();
  });

  it('Fetches the privacy zone uri for the provided environment', async () => {
    await createBCSCClient({ ...bcscClient, environment: 'dev' }, bcscData, 1);
    expect(getPrivacyZones).toHaveBeenCalledTimes(1);
    expect(getPrivacyZones).toHaveBeenCalledWith('dev');

    jest.clearAllMocks();
    await createBCSCClient({ ...bcscClient, environment: 'test' }, bcscData, 1);
    expect(getPrivacyZones).toHaveBeenCalledTimes(1);
    expect(getPrivacyZones).toHaveBeenCalledWith('test');

    jest.clearAllMocks();
    await createBCSCClient({ ...bcscClient, environment: 'prod' }, bcscData, 1);
    expect(getPrivacyZones).toHaveBeenCalledTimes(1);
    expect(getPrivacyZones).toHaveBeenCalledWith('prod');
  });
});
