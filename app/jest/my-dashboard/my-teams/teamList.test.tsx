import React from 'react';
import { render, screen, fireEvent, waitFor, within, getByText, getAllByText } from '@testing-library/react';
import TeamList from 'page-partials/my-dashboard/TeamList';
import { createTeam, deleteTeam, editTeamName } from 'services/team';
import { SessionContext } from '@app/pages/_app';
import { formatWikiURL } from '@app/utils/constants';
import { debug } from 'jest-preview';

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
const HYPERLINK = formatWikiURL('CSS-App-My-Teams#ive-created-a-team-now-what');
const setTeam = jest.fn();
const loadTeams = jest.fn();

const getByLabelText = (text: string) => screen.getByLabelText(text);
const getByRole = (role: string, roleName: string) => screen.getByRole(role, { name: roleName });

const MOCK_EMAIL = 'some.user@email.com';

jest.mock('services/user', () => {
  return {
    getIdirUsersByEmail: jest.fn(() => Promise.resolve([[{ mail: MOCK_EMAIL, id: 1 }]])),
  };
});

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
    const { container } = render(
      <SessionContext.Provider
        value={{ session: { email: 'test@email.com' }, user: { idirEmail: 'test@email.com', role: '' } }}
      >
        <TeamListComponent />
      </SessionContext.Provider>,
    );

    const createTeamButton = getByRole('button', '+ Create a New Team');
    expect(createTeamButton).toBeInTheDocument();
    fireEvent.click(createTeamButton);

    const createNewTeamModal = screen.getByText('Create a New Team');
    expect(createNewTeamModal).toBeInTheDocument();

    const teamNameInputField = getByLabelText('Team Name');
    fireEvent.change(await teamNameInputField, { target: { value: 'SAMPLE TEAM 01' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('SAMPLE TEAM 01')).toBeInTheDocument();
    });

    const memberEmailInputField = document.querySelector('.email-select input') as Element;
    fireEvent.change(memberEmailInputField, { target: { value: MOCK_EMAIL } });
    await waitFor(() => {
      expect(screen.getByDisplayValue(MOCK_EMAIL)).toBeInTheDocument();
      screen.getByText(MOCK_EMAIL).click();
    });

    // With user from context, should be two now
    expect(screen.getAllByText('Admin', { selector: 'option' }).length).toBe(2);
    expect(screen.getByText('Member', { selector: 'option' }));
    expect(getByRole('link', 'View a detailed breakdown of roles on our wiki page')).toHaveAttribute('href', HYPERLINK);

    fireEvent.click(screen.getByRole('img', { name: 'Add Item' }));
    expect(screen.queryAllByText('Enter email address')).toHaveLength(1);
    const removeMember = screen.getAllByRole('img', { name: 'Delete' });
    fireEvent.click(removeMember[1]);
    expect(screen.queryAllByText('Enter email address')).toHaveLength(0);

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
    expect(screen.getByText('Team Name')).toBeInTheDocument();
    getByRole('columnheader', 'Actions');
    fireEvent.click(getByRole('row', 'SAMPLE_TEAM Edit Delete'));
    expect(getByRole('row', 'SAMPLE_TEAM Edit Delete')).toHaveClass('active');
  });

  it('Should be able to click the Delete button, and confirm deletion', async () => {
    const component = render(<TeamListComponent />);
    fireEvent.click(getByRole('button', 'Delete'));
    await waitFor(() => {
      expect(screen.getByText('Delete team'));
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
      expect(screen.getByText('Edit Team Name'));
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
