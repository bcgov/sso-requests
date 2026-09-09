import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import OrganizationList from '@app/page-partials/my-dashboard/OrganizationList';
import OrganizationInfoTabs from '@app/page-partials/my-dashboard/OrganizationInfoTabs';
import {
  deleteOrganization,
  deleteOrganizationApiAccount,
  getOrganizationApiAccounts,
  getOrganizationMembers,
  getOrganizationTeams,
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
  updateOrganizationApiAccountGrants: jest.fn(),
}));

const organization = { id: 1, name: 'Alpha', description: 'Alpha organization', role: 'admin' };
const cssAdmin = { email: 'admin@gov.bc.ca', isAdmin: true, client_roles: ['sso-admin'] };
const organizationAdmin = { email: 'org-admin@gov.bc.ca', isAdmin: false, client_roles: ['user'] };

const mockedDeleteOrganization = jest.mocked(deleteOrganization);
const mockedDeleteOrganizationApiAccount = jest.mocked(deleteOrganizationApiAccount);
const mockedGetOrganizationApiAccounts = jest.mocked(getOrganizationApiAccounts);
const mockedGetOrganizationMembers = jest.mocked(getOrganizationMembers);
const mockedGetOrganizationTeams = jest.mocked(getOrganizationTeams);

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
        grants: [],
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
          grants: [],
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

  it('deletes an active organization API account and reloads the account list', async () => {
    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Accounts' }));
    fireEvent.click(await screen.findByRole('button', { name: 'delete-api-account-11' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockedDeleteOrganizationApiAccount).toHaveBeenCalledWith(organization.id, 11);
      expect(mockedGetOrganizationApiAccounts).toHaveBeenCalledTimes(2);
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
          grants: [],
        },
        {
          id: 12,
          clientId: 'active-service-account',
          organizationId: 1,
          status: 'applied',
          archived: false,
          grants: [],
        },
      ],
      null,
    ]);

    render(<OrganizationInfoTabs organization={organization} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Accounts' }));
    expect(await screen.findByText('active-service-account')).toBeInTheDocument();
    expect(screen.queryByText('archived-service-account')).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-organization-api-account-12-credentials')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'delete-api-account-11' })).not.toBeInTheDocument();
  });

  it('does not offer API account deletion to an ordinary organization member', async () => {
    render(<OrganizationInfoTabs organization={{ ...organization, role: 'member' }} currentUser={organizationAdmin} />);

    fireEvent.click(await screen.findByRole('tab', { name: 'CSS API Accounts' }));
    expect(await screen.findByText('service-account-org-1-11')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'delete-api-account-11' })).not.toBeInTheDocument();
  });
});
