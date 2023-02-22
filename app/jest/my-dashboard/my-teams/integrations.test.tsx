import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MyTeams from '@app/pages/my-dashboard/teams';
import { deleteRequest } from 'services/request';

const sampleSession = {
  email: 'admin01@gov.bc.ca',
  isAdmin: true,
};

jest.mock('services/team', () => ({
  getMyTeams: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        integrationCount: '1',
        name: 'test-team',
        role: 'admin',
        serviceAccountCount: '0',
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
}));

jest.mock('services/request', () => ({
  getTeamIntegrations: jest.fn(() => [
    [
      {
        id: 1,
        devValidRedirectUris: ['http://dev1.com'],
        testValidRedirectUris: ['http://test.com'],
        prodValidRedirectUris: ['http://prod.com'],
        publicAccess: true,
        realm: 'onestopauth',
        projectName: 'test project',
        projectLead: true,
        agreeWithTerms: true,
        environments: ['dev'],
        archived: false,
        usesTeam: true,
        serviceType: 'silver',
        status: 'applied',
      },
    ],
    null,
  ]),
  deleteRequest: jest.fn(() => Promise.resolve([[''], null])),
}));

const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '/my-dashboard/integrations',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
}));

describe('Integrations tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected table column headers, and corresponding integrations in the list', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    await screen.findByRole('columnheader', { name: 'Status' });
    await screen.findByRole('columnheader', { name: 'Request ID' });
    await screen.findByRole('columnheader', { name: 'Project Name' });
    await screen.findAllByRole('columnheader', { name: 'Actions' });
    screen.getByRole('row', { name: 'applied 1 test project Edit Delete' });
  });

  it('Should turn to correct page when click on the view integration icon', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    const viewIntegrationButton = screen.getByLabelText('view');
    fireEvent.click(viewIntegrationButton);
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should turn to correct page when click on the edit integration icon', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    const viewIntegrationButton = screen.getAllByLabelText('edit');
    fireEvent.click(viewIntegrationButton[1]);
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should be able to click the Delete button', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    fireEvent.click(await screen.getByTestId('action-button-delete'));
    expect(screen.findByTitle('Confirm Deletion'));
    const confirmDeleteButton = screen.getAllByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton[1]);
    expect(deleteRequest).toHaveBeenCalledTimes(1);
  });
});
