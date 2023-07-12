import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  deleteServiceAccount,
  getServiceAccountCredentials,
  updateServiceAccountCredentials,
} from '@app/services/team';
import { MyTeamsComponent } from './helpers';

const HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki/CSS-API-Account';

jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: '',
      asPath: '',
      push: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
      },
      beforePopState: jest.fn(() => null),
      prefetch: jest.fn(() => null),
    };
  },
}));

jest.mock('services/team', () => ({
  getMyTeams: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        integrationCount: '0',
        name: 'test-team',
        role: 'admin',
        serviceAccountCount: '1',
        updatedAt: '',
      },
    ],
    null,
  ]),
  getTeamMembers: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        idirEmail: 'admin01@gov.bc.ca',
        idirUserid: '',
        pending: false,
        role: 'admin',
        updatedAt: '',
      },
      {
        createdAt: '',
        id: 2,
        idirEmail: 'member01@gov.bc.ca',
        idirUserid: '',
        pending: true,
        role: 'member',
        updatedAt: '',
      },
    ],
    null,
  ]),
  getServiceAccounts: jest.fn(() => [
    [
      {
        id: 1,
        clientId: 'service-account-team-1',
        teamId: 1,
        status: 'applied',
        updatedAt: '',
        prNumber: 1,
        archived: false,
        requester: '',
      },
    ],
    null,
  ]),
  getServiceAccountCredentials: jest.fn(() => Promise.resolve([[''], null])),
  updateServiceAccountCredentials: jest.fn(() => Promise.resolve([[''], null])),
  deleteServiceAccount: jest.fn(() => Promise.resolve([[''], null])),
}));

jest.mock('services/request', () => ({
  getTeamIntegrations: jest.fn(() => [[{}], null]),
}));

jest.mock('utils/text', () => ({
  downloadText: jest.fn(() => {
    return true;
  }),
  prettyJSON: jest.fn(() => {
    ('');
  }),
  copyTextToClipboard: jest.fn(() => {
    return true;
  }),
}));

describe('CSS API Account tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected table column headers, and corresponding API account in the list, and turn to correct page when click on the hyperlink', async () => {
    render(<MyTeamsComponent />);
    await waitFor(() => {
      screen.getByRole('button', { name: '+ Create a New Team' });
    });
    fireEvent.click(screen.getByRole('cell', { name: 'test-team' }));
    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));

    screen.getByText('API Account ID');
    await screen.findAllByRole('columnheader', { name: 'Actions' });
    screen.getByRole('row', { name: '1 Copy to clipboard Download Update secret Delete' });
    expect(screen.getByRole('link', { name: 'click to learn more on our wiki page' })).toHaveAttribute(
      'href',
      HYPERLINK,
    );
  });

  it('Should be able to click the Copy to clipboard icon to copy token information', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));

    const copyButton = screen.getByRole('button', { name: 'Copy to clipboard' });
    fireEvent.click(copyButton);
    expect(getServiceAccountCredentials).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Download icon to download token information', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));

    const downloadButton = screen.getByRole('button', { name: 'Download' });
    fireEvent.click(downloadButton);
    expect(getServiceAccountCredentials).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Update secret icon to update token information', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));

    const updateSecretButton = screen.getByRole('button', { name: 'Update secret' });
    fireEvent.click(updateSecretButton);
    expect(screen.getByTitle('Request a new secret for CSS API Account'));
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    });
    expect(updateServiceAccountCredentials).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Delete icon to delete the API Account', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));

    const deleteButton = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton[1]);
    await screen.findByTitle('Delete CSS API Account');
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Delete CSS API Account' }));
    });
    expect(deleteServiceAccount).toHaveBeenCalledTimes(1);
  });
});
