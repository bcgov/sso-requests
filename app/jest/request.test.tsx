import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import RequestPage from 'pages/request/[rid]';
import { getRequest, isRequestBcscExcluded } from 'services/request';
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
    isRequestBcscExcluded: jest.fn(() => Promise.resolve([false, null])),
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

  it('Only checks the BCSC exclusion once the request has loaded', async () => {
    (getRequest as jest.Mock).mockResolvedValueOnce([{ id: 1, serviceType: 'gold' }, null]);
    setUpRouter('/request/1', sandbox, { rid: 1 });
    render(<RequestPage currentUser={{}} />);
    await waitFor(() => screen.getByText('Requester Info'));
    expect(isRequestBcscExcluded).toHaveBeenCalledTimes(1);
    expect(isRequestBcscExcluded).toHaveBeenCalledWith(1);
  });
});
