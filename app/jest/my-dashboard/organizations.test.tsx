import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrganizationList from '@app/page-partials/my-dashboard/OrganizationList';
import OrganizationInfoTabs from '@app/page-partials/my-dashboard/OrganizationInfoTabs';
import { PRESETS } from '@sso/authz';
import {
  createOrganizationApiAccount,
  deleteOrganization,
  deleteOrganizationApiAccount,
  getOrganizationApiAccounts,
  getOrganizationMembers,
  getOrganizationTeams,
  removeOrganizationMember,
  removeTeamFromOrganization,
  searchTeamsForOrganization,
  getTeamIntegrationsForOrganization,
  updateOrganizationApiAccountSecret,
} from '@app/services/organization';

jest.mock('@app/services/organization', () => ({
  addOrganizationMember: jest.fn(),
  createOrganization: jest.fn(),
  createOrganizationApiAccount: jest.fn(),
  deleteOrganization: jest.fn(),
  deleteOrganizationApiAccount: jest.fn(),
  getOrganizationApiAccountCredentials: jest.fn(),
  getOrganizationApiAccounts: jest.fn(),
  getOrganizationMembers: jest.fn(),
  getOrganizationTeams: jest.fn(),
  getTeamIntegrationsForOrganization: jest.fn(),
  inviteTeamToOrganization: jest.fn(),
  removeOrganizationMember: jest.fn(),
  removeTeamFromOrganization: jest.fn(),
  searchTeamsForOrganization: jest.fn(),
  updateOrganizationApiAccountSecret: jest.fn(),
}));

const organization = { id: 1, name: 'Alpha', description: 'Alpha organization', role: 'admin' };
const cssAdmin = { email: 'admin@gov.bc.ca', isAdmin: true, client_roles: ['sso-admin'] };
const organizationAdmin = { email: 'org-admin@gov.bc.ca', isAdmin: false, client_roles: ['user'] };

const mockedCreateOrganizationApiAccount = jest.mocked(createOrganizationApiAccount);
const mockedDeleteOrganization = jest.mocked(deleteOrganization);
const mockedDeleteOrganizationApiAccount = jest.mocked(deleteOrganizationApiAccount);
const mockedGetOrganizationApiAccounts = jest.mocked(getOrganizationApiAccounts);
const mockedGetOrganizationMembers = jest.mocked(getOrganizationMembers);
const mockedGetOrganizationTeams = jest.mocked(getOrganizationTeams);
const mockedRemoveOrganizationMember = jest.mocked(removeOrganizationMember);
const mockedRemoveTeamFromOrganization = jest.mocked(removeTeamFromOrganization);
const mockedSearchTeams = jest.mocked(searchTeamsForOrganization);
const mockedUpdateOrganizationApiAccountSecret = jest.mocked(updateOrganizationApiAccountSecret);
const mockedGetTeamIntegrationsForOrganization = jest.mocked(getTeamIntegrationsForOrganization);

const member = (userId: number, role: string) => ({
  organizationId: 1,
  userId,
  role,
  user: { id: userId, idirEmail: `member-${userId}@gov.bc.ca` },
});

const teamLink = (overrides: any = {}) => ({
  id: 3,
  organizationId: 1,
  teamId: 7,
  permissions: [...PRESETS.editor],
  pending: false,
  team: { id: 7, name: 'Payments Team' },
  overrides: [],
  ...overrides,
});

describe('Organization deletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDeleteOrganization.mockResolvedValue([{ success: true }, null]);
    mockedDeleteOrganizationApiAccount.mockResolvedValue([
      {
        id: 11,
        clientId: 'service-account-org-1-11',
        organizationId: 1,
        status: 'submitted',
        archived: true,
      },
      null,
    ]);
    mockedGetOrganizationMembers.mockResolvedValue([[], null]);
    mockedGetOrganizationTeams.mockResolvedValue([[], null]);
    mockedGetOrganizationApiAccounts.mockResolvedValue([
      [
        {
          id: 11,
          clientId: 'service-account-org-1-11',
          organizationId: 1,
          status: 'applied',
          archived: false,
        },
      ],
      null,
    ]);
  });

  it('shows organization deletion only to CSS administrators and reloads after confirmation', async () => {
    const reload = jest.fn();
    const { rerender } = render(
      <OrganizationList
        currentUser={cssAdmin}
        organizations={[organization]}
        loading={false}
        hasError={false}
        setOrganization={jest.fn()}
        activeOrganizationId={organization.id}
        reload={reload}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'delete-Alpha' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Organization' }));

    await waitFor(() => {
      expect(mockedDeleteOrganization).toHaveBeenCalledWith(organization.id);
      expect(reload).toHaveBeenCalledTimes(1);
    });

    rerender(
      <OrganizationList
        currentUser={organizationAdmin}
        organizations={[organization]}
        loading={false}
        hasError={false}
        setOrganization={jest.fn()}
        activeOrganizationId={organization.id}
        reload={reload}
      />,
    );

    expect(screen.queryByRole('button', { name: 'delete-Alpha' })).not.toBeInTheDocument();
  });

  it('keeps the modal open and explains how to resolve an active API account conflict', async () => {
    mockedDeleteOrganization.mockResolvedValue([null, 'organization still has active api accounts' as any]);

    render(
      <OrganizationList
        currentUser={cssAdmin}
        organizations={[organization]}
        loading={false}
        hasError={false}
        setOrganization={jest.fn()}
        activeOrganizationId={organization.id}
        reload={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'delete-Alpha' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Organization' }));

    expect(
      await screen.findByText(
        'Delete the active CSS API accounts for this organization before deleting the organization.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Organization' })).toBeInTheDocument();
  });

  it('summarizes the permissions an API account will receive before requesting it', async () => {
    mockedGetOrganizationApiAccounts.mockResolvedValue([[], null]);
    mockedCreateOrganizationApiAccount.mockResolvedValue([{ id: 12 } as any, null]);
    mockedGetOrganizationTeams.mockResolvedValue([[teamLink()], null]);
    mockedGetTeamIntegrationsForOrganization.mockResolvedValue([[], null]);
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    fireEvent.click(await screen.findByRole('button', { name: '+ Request CSS API Account' }));

    const modal = (await screen.findByText(/A new CSS API account for Alpha/)).closest(
      '#request-organization-api-account-modal',
    )!;
    expect(modal).toBeInTheDocument();
    expect(modal.querySelector('ul')).toHaveTextContent('Payments Team');
    expect(modal.querySelector('ul')).toHaveTextContent('All integrations: Editor');
    expect(mockedCreateOrganizationApiAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Request Account' }));

    await waitFor(() => {
      expect(mockedCreateOrganizationApiAccount).toHaveBeenCalledWith(organization.id);
      expect(mockedGetOrganizationApiAccounts).toHaveBeenCalledTimes(2);
    });
  });

  it('offers no second account once the organization holds one', async () => {
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    expect(await screen.findByText('service-account-org-1-11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Request CSS API Account' })).not.toBeInTheDocument();
    ['copy-credentials', 'download-credentials', 'update-secret', 'delete-api-account'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'false');
    });
  });

  it('deletes the organization API account and reloads the account list', async () => {
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'delete-api-account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockedDeleteOrganizationApiAccount).toHaveBeenCalledWith(organization.id, 11);
      expect(mockedGetOrganizationApiAccounts).toHaveBeenCalledTimes(2);
    });
  });

  it('rotates the organization API account secret after confirmation', async () => {
    mockedUpdateOrganizationApiAccountSecret.mockResolvedValue([{}, null]);
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    fireEvent.click(await screen.findByRole('button', { name: 'update-secret' }));
    expect(await screen.findByText(/You are about to request a new secret/)).toBeInTheDocument();
    expect(mockedUpdateOrganizationApiAccountSecret).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    await waitFor(() => {
      expect(mockedUpdateOrganizationApiAccountSecret).toHaveBeenCalledWith(organization.id, 11);
    });
  });

  it('does not display archived organization API accounts', async () => {
    mockedGetOrganizationApiAccounts.mockResolvedValue([
      [
        {
          id: 11,
          clientId: 'archived-service-account',
          organizationId: 1,
          status: 'applied',
          archived: true,
        },
        {
          id: 12,
          clientId: 'active-service-account',
          organizationId: 1,
          status: 'applied',
          archived: false,
        },
      ],
      null,
    ]);

    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    expect(await screen.findByText('active-service-account')).toBeInTheDocument();
    expect(screen.queryByText('archived-service-account')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'copy-credentials' })).toHaveAttribute('aria-disabled', 'false');
  });

  it('holds the API account actions back from an ordinary organization member', async () => {
    render(<OrganizationInfoTabs organization={{ ...organization, role: 'member' }} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Account' }));
    expect(await screen.findByText('service-account-org-1-11')).toBeInTheDocument();
    ['copy-credentials', 'download-credentials', 'update-secret', 'delete-api-account'].forEach((name) => {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-disabled', 'true');
    });

    fireEvent.click(screen.getByRole('button', { name: 'delete-api-account' }));
    expect(screen.queryByText(/Are you sure that you want to delete this CSS API Account/)).not.toBeInTheDocument();
  });
});

/**
 * Managing an organization: what an admin is offered, and the two places the
 * screen holds them back — the team whose removal takes an API account's
 * access with it, and the admin who is the only one left.
 */
describe('Organization management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetOrganizationMembers.mockResolvedValue([[member(11, 'admin'), member(12, 'member')], null]);
    mockedGetOrganizationTeams.mockResolvedValue([[teamLink()] as any, null]);
    mockedGetOrganizationApiAccounts.mockResolvedValue([[], null]);
    mockedGetTeamIntegrationsForOrganization.mockResolvedValue([[], null]);
    mockedRemoveOrganizationMember.mockResolvedValue([{ success: true } as any, null]);
    mockedRemoveTeamFromOrganization.mockResolvedValue([{ success: true } as any, null]);
    mockedSearchTeams.mockResolvedValue([[], null]);
  });

  it('warns that API access is lost before a team is removed', async () => {
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Teams' }));
    await screen.findByRole('button', { name: 'remove-organization-team-7' });
    // The table re-renders as each team's integrations arrive, so the button is
    // read again rather than held across that.
    fireEvent.click(screen.getByRole('button', { name: 'remove-organization-team-7' }));

    expect(
      await screen.findByText('Are you sure that you want to remove Payments Team from Alpha?'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/revoke access to its integrations from organization members and API accounts/),
    ).toBeInTheDocument();
    expect(mockedRemoveTeamFromOrganization).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Team' }));
    await waitFor(() => expect(mockedRemoveTeamFromOrganization).toHaveBeenCalledWith(organization.id, 7));
  });

  it('will not remove the only admin an organization has', async () => {
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    // ActionButton renders an icon, so "disabled" is the aria state.
    expect(await screen.findByRole('button', { name: 'remove-organization-member-11' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('button', { name: 'remove-organization-member-12' })).toHaveAttribute(
      'aria-disabled',
      'false',
    );

    fireEvent.click(screen.getByRole('button', { name: 'remove-organization-member-11' }));
    expect(mockedRemoveOrganizationMember).not.toHaveBeenCalled();
  });

  it('removes an admin once a second one is there', async () => {
    mockedGetOrganizationMembers.mockResolvedValue([[member(11, 'admin'), member(12, 'admin')], null]);
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    await screen.findByRole('button', { name: 'remove-organization-member-11' });
    fireEvent.click(screen.getByRole('button', { name: 'remove-organization-member-11' }));

    await waitFor(() => expect(mockedRemoveOrganizationMember).toHaveBeenCalledWith(organization.id, 11));
  });

  it('does not offer "No access" as the level asked of a team', async () => {
    mockedSearchTeams.mockResolvedValue([[{ id: 7, name: 'Payments Team', available: true }] as any, null]);
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Teams' }));
    fireEvent.click(screen.getByRole('button', { name: '+ Invite a Team' }));

    const teamSelect = document.getElementById('invite-team-select') as HTMLElement;
    fireEvent.keyDown(teamSelect, { keyCode: 40 });
    fireEvent.click(await screen.findByRole('option', { name: 'Payments Team (#7)' }));

    const levels = document.getElementById('invite-permissions') as HTMLElement;
    fireEvent.keyDown(levels, { keyCode: 40 });
    expect(await screen.findByRole('option', { name: 'Viewer' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'No access' })).not.toBeInTheDocument();
  });
});
