import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import TeamList from 'page-partials/my-dashboard/TeamList';
import { createTeam, deleteTeam, editTeamName } from 'services/team';

function TeamListComponent() {
  return (
    <TeamList
      currentUser={sampleSession}
      setTeam={setTeam}
      loading={false}
      teams={sampleTeam}
      loadTeams={loadTeams}
      hasError={false}
    />
  );
}

const sampleSession = { email: 'sampleSession@gov.bc.ca', isAdmin: true };
const sampleTeam = [
  {
    createdAt: '',
    id: 1,
    integrationCount: '0',
    name: 'SAMPLE_TEAM',
    role: 'admin',
    serviceAccountCount: '1',
    updatedAt: '',
  },
];
const HYPERLINK = 'https://github.com/bcgov/sso-keycloak/wiki/CSS-App-My-Teams';
const setTeam = jest.fn();
const loadTeams = jest.fn();

const getByLabelText = (text: string) => screen.getByLabelText(text);
const getByRole = (role: string, roleName: string) => screen.getByRole(role, { name: roleName });

jest.mock('services/team', () => ({
  createTeam: jest.fn(() =>
    Promise.resolve([
      [{ name: 'SAMPLE_TEAM', members: [{ idirEmail: 'sampleSession@gov.bc.ca', role: 'member', id: 0 }] }],
      null,
    ]),
  ),
  getServiceAccounts: jest.fn(() =>
    Promise.resolve([
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
  ),
  deleteTeam: jest.fn(() => Promise.resolve([[''], null])),
  editTeamName: jest.fn(() => Promise.resolve([, null])),
}));

describe('Team List', () => {
  it('Should match the expected button name, and testing on all text-input-box, drop-down-box, hyperlink, and button functionality in the modal', async () => {
    render(<TeamListComponent />);

    const createTeamButton = getByRole('button', '+ Create a New Team');
    expect(createTeamButton).toBeInTheDocument();
    fireEvent.click(createTeamButton);
    await waitFor(() => {
      expect(screen.getByTitle('Create a New Team')).toBeVisible();
    });

    const teamNameInputField = getByLabelText('Team Name');
    fireEvent.change(await teamNameInputField, { target: { value: 'SAMPLE TEAM 01' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('SAMPLE TEAM 01')).toBeInTheDocument();
    });

    const memberEmailInputField = screen.getByPlaceholderText('Enter email address');
    fireEvent.change(await memberEmailInputField, { target: { value: 'sampleMember01@gov.bc.ca' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('sampleMember01@gov.bc.ca')).toBeInTheDocument();
    });

    expect(getByRole('option', 'Admin'));
    expect(getByRole('option', 'Member'));
    expect(getByRole('link', 'View a detailed breakdown of roles on our wiki page')).toHaveAttribute('href', HYPERLINK);

    fireEvent.click(screen.getByRole('img', { name: 'Add Item' }));
    expect(screen.queryAllByPlaceholderText('Enter email address')).toHaveLength(2);
    const removeMember = screen.getAllByRole('img', { name: 'Delete' });
    fireEvent.click(removeMember[1]);
    expect(screen.queryAllByPlaceholderText('Enter email address')).toHaveLength(1);

    const sendInvitationButton = getByRole('button', 'Send Invitation');
    await waitFor(() => {
      expect(sendInvitationButton).toBeInTheDocument();
    });

    await waitFor(async () => {
      fireEvent.click(sendInvitationButton);
    });
    await waitFor(() => {
      expect(createTeam).toHaveBeenCalledTimes(1);
    });
  });

  it('Should match the correct table headers, selected team', async () => {
    render(<TeamListComponent />);

    getByLabelText('Team Name');
    getByRole('columnheader', 'Actions');
    fireEvent.click(getByRole('row', 'SAMPLE_TEAM Edit Delete'));
    expect(getByRole('row', 'SAMPLE_TEAM Edit Delete')).toHaveClass('active');
  });

  it('Should be able to click the Delete button, and confirm deletion', async () => {
    render(<TeamListComponent />);
    fireEvent.click(getByRole('button', 'Delete'));
    await waitFor(() => {
      expect(screen.getByTitle('Delete team'));
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Team' }));
    await waitFor(() => {
      expect(deleteTeam).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to click the Edit button, and save the new team name', async () => {
    render(<TeamListComponent />);
    fireEvent.click(getByRole('button', 'Edit'));
    await waitFor(() => {
      expect(screen.getByTitle('Edit Team Name'));
    });
    const newTeamNameInputField = getByLabelText('New Team Name');
    fireEvent.change(newTeamNameInputField, { target: { value: 'NEW TEAM NAME' } });
    expect(screen.getByDisplayValue('NEW TEAM NAME')).toBeInTheDocument();
    await waitFor(async () => {
      fireEvent.click(getByRole('button', 'Save'));
    });
    expect(editTeamName).toHaveBeenCalledTimes(1);
  });
});
