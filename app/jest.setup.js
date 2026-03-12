import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

jest.setTimeout(10000); // in milliseconds

process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000/api';
process.env.NEXT_PUBLIC_INCLUDE_DIGITAL_CREDENTIAL = 'true';
process.env.NEXT_PUBLIC_INCLUDE_BC_SERVICES_CARD = 'true';
//process.env.NEXT_PUBLIC_ALLOW_BC_SERVICES_CARD_PROD = 'true';
process.env.NEXT_PUBLIC_SSO_URL = 'http://localhost:8080';
process.env.NEXT_PUBLIC_SSO_CLIENT_ID = 'myclient';
