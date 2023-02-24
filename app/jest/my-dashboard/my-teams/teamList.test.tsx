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
    expect(screen.getByTitle('Create a New Team')).toBeVisible();

    const teamNameInputField = getByLabelText('Team Name');
    fireEvent.change(await teamNameInputField, { target: { value: 'SAMPLE TEAM 01' } });
    expect(screen.getByDisplayValue('SAMPLE TEAM 01')).toBeInTheDocument();

    const memberEmailInputField = screen.getByPlaceholderText('Enter email address');
    fireEvent.change(await memberEmailInputField, { target: { value: 'sampleMember01@gov.bc.ca' } });
    expect(screen.getByDisplayValue('sampleMember01@gov.bc.ca')).toBeInTheDocument();

    expect(getByRole('option', 'Admin'));
    expect(getByRole('option', 'Member'));
    expect(getByRole('link', 'View a detailed breakdown of roles on our wiki page')).toHaveAttribute('href', HYPERLINK);

    const sendInvitationButton = getByRole('button', 'Send Invitation');
    expect(sendInvitationButton).toBeInTheDocument();
    await waitFor(() => {
      fireEvent.click(sendInvitationButton);
    });
    expect(createTeam).toHaveBeenCalledTimes(1);
  });

  it('Should match the correct table headers, selected team', () => {
    render(<TeamListComponent />);
    expect(getByRole('columnheader', 'Team Name'));
    expect(getByRole('columnheader', 'Actions'));
    expect(getByRole('row', 'SAMPLE_TEAM Edit Delete')).toHaveClass('active');
  });

  it('Should be able to click the Delete button, and confirm deletion', async () => {
    render(<TeamListComponent />);
    fireEvent.click(getByRole('button', 'Delete'));
    expect(screen.getByTitle('Delete team'));
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('confirm-delete'));
    });
    expect(deleteTeam).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Edit button, and save the new team name', async () => {
    render(<TeamListComponent />);
    fireEvent.click(getByRole('button', 'Edit'));
    expect(screen.getByTitle('Edit Team Name'));
    const newTeamNameInputField = getByLabelText('New Team Name');
    fireEvent.change(await newTeamNameInputField, { target: { value: 'NEW TEAM NAME' } });
    expect(screen.getByDisplayValue('NEW TEAM NAME')).toBeInTheDocument();
    fireEvent.click(getByRole('button', 'Save'));
    expect(editTeamName).toHaveBeenCalledTimes(1);
  });
});
