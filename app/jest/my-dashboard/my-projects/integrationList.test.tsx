import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { useRouter } from 'next/router';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { getRequests, deleteRequest } from 'services/request';
import { sampleRequest } from '../../samples/integrations';

const setIntegration = jest.fn();
const setIntegrationCount = jest.fn();

const mockClientRolesResult = {
  ...sampleRequest,
  id: 1,
  serviceType: 'gold',
  status: 'applied',
  authType: 'browser-login',
};

jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({ query: {}, push: jest.fn, replace: jest.fn })),
}));

jest.mock('services/request', () => ({
  getRequests: jest.fn().mockImplementation(() => Promise.resolve([[mockClientRolesResult], null])),
  deleteRequest: jest.fn(() => Promise.resolve([[], null])),
}));

describe('Integration list', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display button and correct data', async () => {
    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    expect(getRequests).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' })).toHaveClass('pg-button');
    });
    expect(
      screen.getByRole('row', { name: '00000001 test project Completed Browser Login Gold Edit Delete' }),
    ).toHaveClass('active');
  });

  it('should be able to click the Delete button', async () => {
    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('action-button-delete'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirm-delete'));
    });
    expect(deleteRequest).toHaveBeenCalled();
  });

  it('should be able to click the Edit button', async () => {
    const mockRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
      pathname: '/request/1?status=applied',
      query: '',
      push: jest.fn(() => Promise.resolve(true)),
      replace: jest.fn(() => Promise.resolve(true)),
    }));

    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('edit'));
    });
    expect(mockRouter).toHaveBeenCalled();
  });

  it('should be able to click the Create Integration button', async () => {
    const mockRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
      pathname: '/request',
      query: '',
      push: jest.fn(() => Promise.resolve(true)),
      replace: jest.fn(() => Promise.resolve(true)),
    }));

    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });
    expect(mockRouter).toHaveBeenCalled();
  });
});
