import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { sampleRequest } from '../../samples/integrations';

const setIntegration = jest.fn();
const setIntegrationCount = jest.fn();
const HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki/Using-Your-SSO-Client#confidential-vs-private-client';

function IntegrationListComponent() {
  return <IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />;
}

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
    render(<IntegrationListComponent />);

    await waitFor(() => {
      expect(spyGetRequest).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' })).toHaveClass('pg-button');
    });
    expect(
      screen.getByRole('row', { name: 'Request ID Project Name Status Usecase Service Type Actions' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('row', { name: '00000001 test project Completed Browser Login Gold Edit Delete' }),
    ).toHaveClass('active');
  });

  it('Should be able to click the Delete button', async () => {
    render(<IntegrationListComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.getByTitle('Confirm Deletion'));
    });

    await waitFor(async () => {
      fireEvent.click(await screen.findByTestId('confirm-delete'));
    });
    await waitFor(() => {
      expect(spyDeleteRequest).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to click the Edit button', async () => {
    render(<IntegrationListComponent />);
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

    render(<IntegrationListComponent />);
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });
    expect(spyRouter).toHaveBeenCalled();
  });

  it('testing on the external link with empty integration list', async () => {
    const spyGetRequest = jest
      .spyOn(require('services/request'), 'getRequests')
      .mockImplementation(() => Promise.resolve([[], null]));

    render(<IntegrationListComponent />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Public or Confidential, learn more' })).toHaveAttribute(
        'href',
        HYPERLINK,
      );
    });
  });
});
