import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
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

const spyGetRequest = jest
  .spyOn(require('services/request'), 'getRequests')
  .mockImplementation(() => Promise.resolve([[mockClientRolesResult], null]));
const spyDeleteRequest = jest
  .spyOn(require('services/request'), 'deleteRequest')
  .mockImplementation(() => Promise.resolve([[], null]));
const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '/request/1?status=applied',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
  replace: jest.fn(() => Promise.resolve(true)),
}));

describe('Integration list', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected button name, table headers, selected integration; expect the endpoint function been called', async () => {
    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);

    await waitFor(() => {
      expect(spyGetRequest).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' })).toHaveClass('pg-button');
    });
    expect(screen.getByRole('columnheader', { name: 'Request ID' })).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: '00000001 test project Completed Browser Login Gold Edit Delete' }),
    ).toHaveClass('active');
  });

  it('Should be able to click the Delete button', async () => {
    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    });
    expect(screen.getByTitle('Confirm Deletion'));
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirm-delete'));
    });
    expect(spyDeleteRequest).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Edit button', async () => {
    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('edit'));
    });
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should be able to click the Create Integration button', async () => {
    const spyRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
      pathname: '/request',
      query: '',
      push: jest.fn(() => Promise.resolve(true)),
      replace: jest.fn(() => Promise.resolve(true)),
    }));

    render(<IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />);
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });
    expect(spyRouter).toHaveBeenCalled();
  });
});
