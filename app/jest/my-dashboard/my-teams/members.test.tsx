import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { addTeamMembers, inviteTeamMember, deleteTeamMember } from 'services/team';
import MyTeams from '@app/pages/my-dashboard/teams';

const sampleSession = {
  email: 'admin01@gov.bc.ca',
  isAdmin: true,
};

const HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki/CSS-App-My-Teams';

const spyValidateTeam = jest
  .spyOn(require('form-components/team-form/TeamMembersForm'), 'validateTeam')
  .mockImplementation(() => [false, null]);

jest.mock('services/team', () => ({
  getMyTeams: jest.fn(() => [
    [
      {
        createdAt: '',
        id: 1,
        integrationCount: '0',
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
  addTeamMembers: jest.fn(() => [, null]),
  inviteTeamMember: jest.fn(() => [, null]),
  deleteTeamMember: jest.fn(() => [, null]),
}));

jest.mock('services/request', () => ({
  getTeamIntegrations: jest.fn(() => [[], null]),
}));

describe('Members tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected button name, and testing on all drop-down-box, hyperlink, and button functionality in the modal', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const addNewMemberButton = screen.findByText('+ Add New Team Members');
    fireEvent.click(await addNewMemberButton);
    expect(screen.getByTitle('Add a New Team Member')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View a detailed breakdown of roles on our wiki page' })).toHaveAttribute(
      'href',
      HYPERLINK,
    );
    expect(screen.findByRole('option', { name: 'Member' }));

    const confirmButton = screen.getByRole('button', { name: 'Confirm' });
    await waitFor(() => {
      fireEvent.click(confirmButton);
    });
    expect(spyValidateTeam).toHaveBeenCalledTimes(1);
    expect(addTeamMembers).toHaveBeenCalledTimes(1);
  });

  it('Should match the expected table column headers, and corresponding members in the list', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    await screen.findByRole('columnheader', { name: 'Status' });
    await screen.findByRole('columnheader', { name: 'Email' });
    await screen.findByRole('columnheader', { name: 'Role' });
    await screen.findAllByRole('columnheader', { name: 'Actions' });
    screen.getByRole('row', { name: 'admin01@gov.bc.ca Admin' });
    screen.getByRole('row', { name: 'member01@gov.bc.ca Member Resend Invitation Delete User' });
  });

  it('Should be able to click the resend invitation button', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const resendButton = screen.findByRole('img', { name: 'Resend Invitation' });
    fireEvent.click(await resendButton);
    expect(inviteTeamMember).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Delete button', async () => {
    render(<MyTeams session={sampleSession} onLoginClick={jest.fn()} onLogoutClick={jest.fn()} key={'teams'} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const deleteButton = screen.getByRole('img', { name: 'Delete User' });
    fireEvent.click(deleteButton);
    expect(screen.findByTitle('Delete Team Member'));
    const confirmDeleteButton = screen.getAllByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton[2]);
    expect(deleteTeamMember).toHaveBeenCalledTimes(1);
  });
});
