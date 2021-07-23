import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import RequestPage from 'pages/request/[rid]';
import { getRequest } from 'services/request';
import { setUpRouter } from './utils/setup';

jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('services/request', () => {
  const promise = Promise.resolve;
  return {
    createRequest: jest.fn(),
    updateRequest: jest.fn(() => promise),
    getRequest: jest.fn(),
  };
});

let sandbox: any = {};

describe('Fetching data', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Skips fetching data for newly created forms', () => {
    setUpRouter('/request/1', sandbox, { rid: 1, newForm: true });
    render(<RequestPage currentUser={{}} />);
    expect(getRequest).not.toHaveBeenCalled();
  });

  it('Fetches data otherwise', async () => {
    setUpRouter('/request/1', sandbox, { rid: 1 });
    render(<RequestPage currentUser={{}} />);
    expect(getRequest).toHaveBeenCalled();
    screen.getByText('Loading information...');
    await waitFor(() => screen.getByText('Requester Info'));
  });
});
