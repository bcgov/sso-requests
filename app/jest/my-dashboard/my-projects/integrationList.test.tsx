import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import IntegrationList from 'page-partials/my-dashboard/IntegrationList';
import { sampleRequest } from '../../samples/integrations';
import { formatWikiURL } from '@app/utils/constants';
import * as requestService from 'services/request';

const setIntegration = jest.fn();
const setIntegrationCount = jest.fn();
const HYPERLINK = formatWikiURL('Useful-References#client');

function IntegrationListComponent() {
  return <IntegrationList setIntegration={setIntegration} setIntegrationCount={setIntegrationCount} />;
}

const mockRequest = {
  ...sampleRequest,
  id: 1,
  serviceType: 'gold',
  status: 'applied',
  authType: 'browser-login',
};

const spyGetRequest = jest
  .spyOn(require('services/request'), 'getRequests')
  .mockImplementation(() => Promise.resolve([[mockRequest], null]));
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
      expect(screen.getByRole('button', { name: '+ Request SSO Integration' }));
    });
    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getByRole('row', { name: '00000001 test project Completed Browser Login Gold Edit Delete' }));
  });

  it('Should be able to click the Delete button', async () => {
    render(<IntegrationListComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion'));
    });
    const confirmationInput = await screen.findByTestId('delete-confirmation-input');
    const confirmDeleteButton = await screen.findByTestId('confirm-delete-confirm-deletion');

    fireEvent.change(confirmationInput, { target: { value: sampleRequest.projectName } });
    expect((confirmDeleteButton as HTMLButtonElement).disabled).toBeFalsy();

    await waitFor(async () => {
      fireEvent.click(await screen.findByTestId('confirm-delete-confirm-deletion'));
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

describe('Delete Permissions', () => {
  it('allows deletion for direct ownership', async () => {
    jest
      .spyOn(requestService, 'getRequests')
      .mockResolvedValueOnce([[{ ...sampleRequest, usesTeam: false, projectLead: true }], null]);
    render(<IntegrationListComponent />);

    const button = await screen.findByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('allows deletion for direct ownership when team is not yet selected', async () => {
    jest
      .spyOn(requestService, 'getRequests')
      .mockResolvedValueOnce([[{ ...sampleRequest, usesTeam: true, projectLead: false, teamId: undefined }], null]);
    render(<IntegrationListComponent />);

    const button = await screen.findByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });

  it('disables deletion for team integration when user is not a team admin', async () => {
    jest
      .spyOn(requestService, 'getRequests')
      .mockResolvedValueOnce([
        [{ ...sampleRequest, usesTeam: true, projectLead: false, teamId: 1, userTeamRole: 'member' }],
        null,
      ]);
    render(<IntegrationListComponent />);

    const button = await screen.findByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('aria-disabled', 'true');
  });

  it('allows deletion for team integration when user is a team admin', async () => {
    jest
      .spyOn(requestService, 'getRequests')
      .mockResolvedValueOnce([
        [{ ...sampleRequest, usesTeam: true, projectLead: false, teamId: 1, userTeamRole: 'admin' }],
        null,
      ]);
    render(<IntegrationListComponent />);

    const button = await screen.findByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('aria-disabled', 'false');
  });
});
