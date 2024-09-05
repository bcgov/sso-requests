import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';

jest.setTimeout(10000); // in milliseconds
global.crypto = new Crypto();

process.env.INCLUDE_DIGITAL_CREDENTIAL = true;
process.env.INCLUDE_BC_SERVICES_CARD = true;
process.env.ALLOW_BC_SERVICES_CARD_PROD = true;
