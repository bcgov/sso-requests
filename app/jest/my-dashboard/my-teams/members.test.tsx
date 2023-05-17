import React from 'react';
import { render, screen, fireEvent, waitFor, within, act } from '@testing-library/react';
import { addTeamMembers, inviteTeamMember, deleteTeamMember } from 'services/team';
import { MyTeamsComponent } from './helpers';

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

describe('Members tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected button name, and testing on all drop-down-box, hyperlink, and button functionality in the modal', async () => {
    render(<MyTeamsComponent />);
    await waitFor(() => {
      screen.getByRole('button', { name: '+ Create a New Team' });
    });
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const addNewMemberButton = screen.findByText('+ Add New Team Members');
    fireEvent.click(await addNewMemberButton);
    expect(screen.getByTitle('Add a New Team Member')).toBeVisible();
    expect(screen.getByRole('link', { name: 'View a detailed breakdown of roles on our wiki page' })).toHaveAttribute(
      'href',
      HYPERLINK,
    );
    expect(screen.findByRole('option', { name: 'Member' }));

    fireEvent.click(screen.getByRole('img', { name: 'Add Item' }));
    expect(screen.queryAllByPlaceholderText('Enter email address')).toHaveLength(3);
    const removeMember = screen.getAllByRole('img', { name: 'Delete' });
    fireEvent.click(removeMember[1]);
    expect(screen.queryAllByPlaceholderText('Enter email address')).toHaveLength(2);

    const confirmButton = await screen.findByRole('button', { name: 'Confirm' });
    fireEvent.click(confirmButton);
    await waitFor(() => {
      expect(spyValidateTeam).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(addTeamMembers).toHaveBeenCalledTimes(1);
    });
  });

  it('Should match the expected table column headers, and corresponding members in the list', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    screen.getByRole('columnheader', { name: 'Status' });
    screen.findByText('Email');
    screen.getByRole('columnheader', { name: 'Role' });
    screen.getAllByRole('columnheader', { name: 'Actions' });
    screen.getByRole('row', { name: 'admin01@gov.bc.ca Admin' });
    screen.getByRole('row', { name: 'member01@gov.bc.ca Member Resend Invitation Delete User' });
  });

  it('Should be able to click the resend invitation button', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const resendButton = screen.findByRole('img', { name: 'Resend Invitation' });
    fireEvent.click(await resendButton);
    expect(inviteTeamMember).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Delete button', async () => {
    render(<MyTeamsComponent />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Members' }));

    const deleteButton = screen.getByRole('img', { name: 'Delete User' });
    fireEvent.click(deleteButton);
    await waitFor(() => {
      expect(screen.getByTitle('Delete Team Member'));
    });
    const confirmDeleteButton = await screen.findAllByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton[2]);
    await waitFor(() => {
      expect(deleteTeamMember).toHaveBeenCalledTimes(1);
    });
  });
});
