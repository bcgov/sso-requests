import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { deleteRequest } from 'services/request';
import { MyTeamsComponent } from './helpers';

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
        devValidRedirectUris: ['http://dev.com'],
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
        serviceType: 'gold',
        status: 'applied',
      },
      {
        id: 2,
        devValidRedirectUris: ['http://dev.com'],
        testValidRedirectUris: ['http://test.com'],
        prodValidRedirectUris: ['http://prod.com'],
        publicAccess: true,
        realm: 'onestopauth',
        projectName: 'test project 02',
        projectLead: true,
        agreeWithTerms: true,
        environments: ['dev'],
        archived: false,
        usesTeam: true,
        serviceType: 'gold',
        status: 'draft',
      },
      {
        id: 3,
        devValidRedirectUris: ['http://dev.com'],
        testValidRedirectUris: ['http://test.com'],
        prodValidRedirectUris: ['http://prod.com'],
        publicAccess: true,
        realm: 'onestopauth',
        projectName: 'test project 03',
        projectLead: true,
        agreeWithTerms: true,
        environments: ['dev'],
        archived: false,
        usesTeam: true,
        serviceType: 'gold',
        status: 'submitted',
      },
      {
        id: 4,
        devValidRedirectUris: ['http://dev.com'],
        testValidRedirectUris: ['http://test.com'],
        prodValidRedirectUris: ['http://prod.com'],
        publicAccess: true,
        realm: 'onestopauth',
        projectName: 'test project 04',
        projectLead: true,
        agreeWithTerms: true,
        environments: ['dev'],
        archived: false,
        usesTeam: true,
        serviceType: 'gold',
        status: 'prFailed',
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
    render(<MyTeamsComponent />);
    await waitFor(() => {
      screen.getByRole('button', { name: '+ Create a New Team' });
    });
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    screen.getByRole('columnheader', { name: 'Status' });
    screen.getByText('Request ID');
    screen.getByText('Project Name');
    screen.getAllByRole('columnheader', { name: 'Actions' });
    screen.getByRole('row', { name: 'applied 1 test project Edit Delete' });
    screen.getByRole('row', { name: 'draft 2 test project 02 Edit Delete' });
    screen.getByRole('row', { name: 'submitted 3 test project 03 Edit Delete' });
    screen.getByRole('row', { name: 'prFailed 4 test project 04 Edit Delete' });
    expect(screen.getByRole('img', { name: 'applied' })).toHaveStyle('color: rgb(46, 133, 64)');
    expect(screen.getByRole('img', { name: 'draft' })).toHaveStyle('color: rgb(26, 90, 150)');
    expect(screen.getByRole('img', { name: 'submitted' })).toHaveStyle('color: rgb(252, 186, 25)');
    expect(screen.getByRole('img', { name: 'prFailed' })).toHaveStyle('color: rgb(255, 3, 3)');
  });

  it('Should turn to correct page when click on the view integration icon', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    const viewIntegrationButton = screen.getAllByLabelText('view');
    fireEvent.click(viewIntegrationButton[0]);
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should turn to correct page when click on the edit integration icon', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    const editIntegrationButton = screen.getAllByLabelText('edit');
    fireEvent.click(editIntegrationButton[1]);
    expect(spyUseRouter).toHaveBeenCalled();
  });

  it('Should be able to click the Delete button', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Integrations' }));

    const actionDeleteButton = screen.getAllByTestId('action-button-delete');
    fireEvent.click(actionDeleteButton[0]);
    expect(screen.findByTitle('Confirm Deletion'));

    const confirmationInput = await screen.findByTestId('delete-confirmation-input');
    fireEvent.change(confirmationInput, { target: { value: 'test project' } });

    const confirmDeleteButton = screen.getAllByTestId('confirm-delete-confirm-deletion');
    fireEvent.click(confirmDeleteButton[0]);
    expect(deleteRequest).toHaveBeenCalledTimes(1);
  });
});
