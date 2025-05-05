import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';

jest.setTimeout(10000); // in milliseconds
global.crypto = new Crypto();

process.env.INCLUDE_DIGITAL_CREDENTIAL = true;
process.env.INCLUDE_BC_SERVICES_CARD = true;
process.env.ALLOW_BC_SERVICES_CARD_PROD = true;

// Jest does not load nextconfig file. Can add any required runTimeConfigs here globally
jest.mock('next/config', () => () => ({
  publicRuntimeConfig: {
    sso_url: process.env.SSO_URL || 'http://localhost:8080',
    sso_client_id: process.env.SSO_CLIENT_ID || 'myclient',
  },
}));
