import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import RequestPage from 'pages/request/[rid]';
import { getRequest } from 'services/request';
import { setUpRouter } from './utils/setup';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  const successResponse = Promise.resolve([{}, null]);
  return {
    createRequest: jest.fn(() => successResponse),
    updateRequest: jest.fn(() => successResponse),
    getRequest: jest.fn(() => successResponse),
  };
});

jest.mock('services/bc-services-card', () => {
  return {
    fetchPrivacyZones: jest.fn(() => {
      return Promise.resolve([[], null]);
    }),
    fetchAttributes: jest.fn(() => {
      return Promise.resolve([[], null]);
    }),
  };
});

let sandbox: any = {};

describe('Fetching data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Fetches data when loading', async () => {
    setUpRouter('/request/1', sandbox, { rid: 1 });
    render(<RequestPage currentUser={{}} />);
    expect(getRequest).toHaveBeenCalled();
    screen.getByText('Loading information...');
    await waitFor(() => screen.getByText('Requester Info'));
  });
});
