import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import {
  listRoleUsers,
  getCompositeClientRoles,
  manageUserRole,
  bulkCreateRole,
  previewRoleSync,
  runRoleSync,
} from 'services/keycloak';
import CreateRoleContent from 'page-partials/my-dashboard/RoleManagement/CreateRoleContent';
import RoleEnvironment from 'page-partials/my-dashboard/RoleManagement/RoleEnvironment';

const mockResult = () => {
  return { ...sampleRequest, authType: 'both' };
};

function RoleEnvironmentComponent() {
  return <RoleEnvironment environment={'dev'} integration={mockResult()} />;
}

function RoleEnvironmentWithMfaComponent() {
  return <RoleEnvironment environment={'dev'} integration={{ ...mockResult(), devIdps: ['idir', 'azureidir'] }} />;
}

const testUsers = [
  {
    id: '01',
    username: 'user01@idir',
    enabled: true,
    totp: false,
    emailVerified: false,
    firstName: 'fn',
    lastName: 'ln',
    email: 'role1@gov.bc.ca',
    attributes: { idir_userid: ['01'] },
    disableableCredentialTypes: [],
    requiredActions: [],
    notBefore: 0,
  },
  {
    id: '02',
    username: 'service-account-user02',
    enabled: true,
    totp: false,
    emailVerified: false,
    firstName: '',
    lastName: '',
    email: '',
    attributes: {},
    disableableCredentialTypes: [],
    requiredActions: [],
    notBefore: 0,
  },
];

jest.mock('services/request', () => {
  return {
    getRequest: jest.fn(() => Promise.resolve([mockResult(), null])),
  };
});

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([[{ name: 'role-1' }, { name: 'role-2' }], null])),
  listComposites: jest.fn(() => Promise.resolve([[false, false], null])),
  listRoleUsers: jest.fn(() => Promise.resolve([testUsers, null])),
  getCompositeClientRoles: jest.fn(() => Promise.resolve([['compositeRole1', 'compositeRole2'], null])),
  deleteRole: jest.fn(() => Promise.resolve([[''], null])),
  manageUserRole: jest.fn(() => Promise.resolve([[''], null])),
  bulkCreateRole: jest.fn(() => Promise.resolve([{}, null])),
  previewRoleSync: jest.fn(() => Promise.resolve([[], null])),
  runRoleSync: jest.fn(() => Promise.resolve([[], null])),
}));

describe('role management tab', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should match the expected button name, environment names, select/unselected env, table headers, table contents, place-holder-text in search bar', async () => {
    render(<RoleManagement integration={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
    expect(screen.getByRole('button', { name: '+ Create a New Role' }));
    expect(screen.getByRole('tab', { selected: true, name: 'Dev' }));
    expect(screen.getByRole('tab', { selected: false, name: 'Test' }));
    expect(screen.getByRole('tab', { selected: false, name: 'Prod' }));
    await waitFor(() => {
      screen.getAllByText('Role Name');
    });
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });
    expect(screen.getByPlaceholderText('Search existing roles'));
  });

  it('Should be able to input keywords in Search Existing Role input field', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    const searchRoleInput = screen.findByPlaceholderText('Search existing roles');
    fireEvent.change(await searchRoleInput, { target: { value: 'role-1' } });
    const rolesTable = screen.getByTestId('roles-table');
    const { queryByText } = within(rolesTable);
    await waitFor(() => {
      expect(queryByText('role-1')).toBeInTheDocument();
      expect(queryByText('role-2')).toBeNull();
    });
  });

  it('Testing on the headers, buttons and input field in the modal', async () => {
    render(<CreateRoleContent integrationId={sampleRequest.id as number} environments={['dev', 'test', 'prod']} />);

    screen.getByText('Role Name');
    screen.getByText('Environments');
    screen.getByText('Add another role');

    fireEvent.click(screen.getByText('Add another role'));

    const removeRoleNameInput = screen.getAllByTestId('remove-role');
    fireEvent.click(removeRoleNameInput[1]);

    expect(screen.queryAllByTestId('role-name-input-field')).toHaveLength(1);
  });

  it('Should be able to input keywords in Create New Role input field, and corresponding end-point should be called', async () => {
    render(<RoleManagement integration={{ ...sampleRequest, environments: ['dev', 'test'] }} />);
    fireEvent.click(screen.getByRole('button', { name: '+ Create a New Role' }));
    await waitFor(() => {
      expect(screen.getByTitle('Create New Role')).toBeTruthy();
    });

    const createRoleTable = screen.getByTestId('create-role-table');
    const { queryByText } = within(createRoleTable);
    await waitFor(() => {
      expect(queryByText('Role Name')).toBeInTheDocument();
      expect(queryByText('Environments')).toBeInTheDocument();
      expect(queryByText('Add another role')).toBeInTheDocument();
    });

    const newRoleNameInput = await screen.findByTestId('role-name-input-field');
    fireEvent.change(newRoleNameInput, { target: { value: 'new_role' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('new_role')).toBeInTheDocument();
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Save'));
    });
    await waitFor(() => {
      expect(bulkCreateRole).toHaveBeenCalled();
    });
  });

  it('Should be able to click the Delete Role button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    const deleteButton = await screen.findAllByTestId('delete-role');
    fireEvent.click(deleteButton[0]);
    await waitFor(async () => {
      expect(await screen.findByTitle('Delete Role')).toBeInTheDocument();
    });
  });

  it('Should be able to show export button, and check the endpoint function been called after clicking on it', async () => {
    render(<RoleEnvironmentComponent />);

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(1);
    });

    (listRoleUsers as jest.Mock).mockResolvedValueOnce([testUsers, null]);

    (listRoleUsers as jest.Mock).mockResolvedValueOnce([[], null]);

    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Export' }));
    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(2);
    });
  });

  it('Should be able to click the User Details button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    fireEvent.click(screen.getByRole('img', { name: 'User Detail' }));

    expect(await screen.findByTitle('Additional User Info')).toBeVisible();
  });

  it('Should be able to click the Remove User button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    });
    fireEvent.click(await screen.findByRole('img', { name: 'Remove User' }));

    await waitFor(async () => {
      expect(await screen.findByText('Remove User from Role')).toBeVisible();
    });
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    });
    await waitFor(() => {
      expect(manageUserRole).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to show service accounts assigned to a role inside service accounts tab', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Service Accounts' }));
    });
    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(sampleRequest.projectName as string)).toBeTruthy();
    });
  });

  it('Should keep the active tab selected if still avaiable on a new integration', async () => {
    // Setup render and select a role
    const { rerender } = render(<RoleEnvironment integration={{ ...sampleRequest, authType: 'both' }} />);

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));

    // Defaults to users tab
    expect(screen.queryByText('Users')).toBeInTheDocument();
    expect(screen.queryByText('Service Accounts')).toBeInTheDocument();
    expect(screen.queryByText('Composite Roles')).toBeInTheDocument();
    expect(screen.queryByText('Users')).toHaveAttribute('aria-selected', 'true');

    // Switch to Composite roles tab
    fireEvent.click(screen.getByText('Composite Roles'));
    expect(screen.queryByText('Users')).toHaveAttribute('aria-selected', 'false');
    expect(screen.queryByText('Composite Roles')).toHaveAttribute('aria-selected', 'true');

    // Expect rerender to keep active tab selection since composite roles are avaiable on service-accounts
    rerender(<RoleEnvironment integration={{ ...sampleRequest, authType: 'service-account' }} />);
    expect(screen.queryByText('Composite Roles')).toHaveAttribute('aria-selected', 'true');

    // Switch to service accounts tab and then render a browser only integration
    fireEvent.click(screen.getByText('Service Accounts'));
    expect(screen.queryByText('Service Accounts')).toHaveAttribute('aria-selected', 'true');
    rerender(<RoleEnvironment integration={{ ...sampleRequest, authType: 'browser-login' }} />);

    // Defaults back to users tab and service accounts tab unavailable
    expect(screen.queryByText('Service Accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('Users')).toHaveAttribute('aria-selected', 'true');
  });

  it('Should be able to click the remove service account button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(async () => {
      fireEvent.click(screen.getByRole('tab', { name: 'Service Accounts' }));
    });
    await waitFor(() => {
      expect(screen.getByText(sampleRequest.projectName as string)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('img', { name: 'Remove Service Account' }));
    await waitFor(async () => {
      expect(await screen.findByText('Remove Service Account from Role')).toBeInTheDocument();
    });
    await waitFor(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    });
    await waitFor(() => {
      expect(manageUserRole).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to show all existing composite roles, after clicking on the Composite Roles tab', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Composite Roles' }));
    });
    await waitFor(() => {
      expect(screen.getByText('Select the roles to be nested under the Parent role')).toBeTruthy();
    });
    expect(getCompositeClientRoles).toHaveBeenCalled();
    expect(screen.getByText('compositeRole1')).toBeTruthy();
    expect(screen.getByText('compositeRole2')).toBeTruthy();
  });

  it('Should not show the MFA sync entry points when idir and azureidir are not both enabled', async () => {
    render(<RoleEnvironmentComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    expect(screen.queryByTestId('sync-all-roles-btn')).not.toBeInTheDocument();

    expect(screen.queryByTestId('sync-to-mfa')).not.toBeInTheDocument();
  });

  it('Should preview and run a role sync to MFA when idir and azureidir are both enabled', async () => {
    (previewRoleSync as jest.Mock).mockResolvedValueOnce([
      [{ role: 'role-1', total: 5, alreadySynced: 2, toAttempt: 3 }],
      null,
    ]);
    (runRoleSync as jest.Mock).mockResolvedValueOnce([
      [
        { idirUsername: 'user1', guid: 'guid1', role: 'role-1', status: 'SYNCED' },
        { idirUsername: 'user2', guid: 'guid2', role: 'role-1', status: 'ALREADY_SYNCED' },
      ],
      null,
    ]);

    render(<RoleEnvironmentWithMfaComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    const syncButton = await screen.findAllByTestId('sync-to-mfa');
    fireEvent.click(syncButton[0]);

    expect(await screen.findByTitle('Sync IDIR role assignments to IDIR - MFA users for "role-1"')).toBeInTheDocument();
    await waitFor(() => {
      expect(previewRoleSync).toHaveBeenCalledWith(expect.objectContaining({ environment: 'dev', roleName: 'role-1' }));
    });
    expect(await screen.findByText(/3 users to sync/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run Sync' }));
    await waitFor(() => {
      expect(runRoleSync).toHaveBeenCalledWith(expect.objectContaining({ environment: 'dev', roleName: 'role-1' }));
    });
    expect(await screen.findByText('Sync complete.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download Sync Details' })).toBeInTheDocument();
  });

  it('Should show a "Sync All Roles" button that previews/runs a sync across every role', async () => {
    (previewRoleSync as jest.Mock).mockResolvedValueOnce([
      [
        { role: 'role-1', total: 2, alreadySynced: 0, toAttempt: 2 },
        { role: 'role-2', total: 1, alreadySynced: 1, toAttempt: 0 },
      ],
      null,
    ]);

    render(<RoleEnvironmentWithMfaComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    fireEvent.click(screen.getByTestId('sync-all-roles-btn'));
    expect(await screen.findByTitle('Sync All Roles to MFA')).toBeInTheDocument();
    await waitFor(() => {
      expect(previewRoleSync).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'dev', roleName: undefined }),
      );
    });
  });

  it('Should show "No users to sync" and hide the Run Sync button when there is nothing to sync', async () => {
    (previewRoleSync as jest.Mock).mockResolvedValueOnce([
      [{ role: 'role-1', total: 2, alreadySynced: 2, toAttempt: 0 }],
      null,
    ]);

    render(<RoleEnvironmentWithMfaComponent />);
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    const syncButton = await screen.findAllByTestId('sync-to-mfa');
    fireEvent.click(syncButton[0]);

    expect(await screen.findByText('No users to sync')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Run Sync' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
