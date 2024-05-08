import '@testing-library/jest-dom';
import { Crypto } from '@peculiar/webcrypto';

jest.setTimeout(10000); // in milliseconds
global.crypto = new Crypto();

process.env.INCLUDE_DIGITAL_CREDENTIAL = true;
