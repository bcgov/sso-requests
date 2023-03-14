import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import { listClientRoles, listRoleUsers, getCompositeClientRoles, manageUserRole } from 'services/keycloak';
import CreateRoleContent from 'page-partials/my-dashboard/RoleManagement/CreateRoleContent';
import RoleEnvironment from 'page-partials/my-dashboard/RoleManagement/RoleEnvironment';

const mockResult = () => {
  return { ...sampleRequest, authType: 'both' };
};

function RoleEnvironmentComponent() {
  return <RoleEnvironment environment={'dev'} integration={mockResult} />;
}

jest.mock('services/request', () => {
  return {
    getRequest: jest.fn(() => Promise.resolve([mockResult(), null])),
  };
});

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([['role1'], null])),
  listRoleUsers: jest.fn(() =>
    Promise.resolve([
      [
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
      ],
      null,
    ]),
  ),
  getCompositeClientRoles: jest.fn(() => Promise.resolve([['compositeRole1', 'compositeRole2'], null])),
  deleteRole: jest.fn(() => Promise.resolve([[''], null])),
  manageUserRole: jest.fn(() => Promise.resolve([[''], null])),
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
      expect(screen.getByRole('row', { name: 'Role Name' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.findByRole('cell', { name: 'role1' }));
    });
    expect(screen.getByPlaceholderText('Search existing roles'));
  });

  it('Should be able to input keywords in Search Existing Role input field', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    const searchRoleInput = screen.findByRole('textbox');
    fireEvent.change(await searchRoleInput, { target: { value: 'role' } });
    expect(screen.getByDisplayValue('role')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role1' }));
    });
  });

  it('Testing on the headers, buttons and input field in the modal', async () => {
    render(<CreateRoleContent integrationId={sampleRequest.id as number} environments={['dev', 'test', 'prod']} />);
    screen.getByRole('row', { name: 'Role Name Environments' });
    fireEvent.click(screen.getByRole('img', { name: 'Add Role' }));
    expect(screen.queryAllByTestId('role-name-input-field')).toHaveLength(2);
    const removeRoleNameInput = screen.getAllByRole('img', { name: 'Remove Role' });
    fireEvent.click(removeRoleNameInput[1]);
    expect(screen.queryAllByTestId('role-name-input-field')).toHaveLength(1);
  });

  it('Should be able to input keywords in Create New Role input field', async () => {
    render(<CreateRoleContent integrationId={1} environments={['dev']} />);

    const newRoleNameInput = screen.getByTestId('role-name-input-field');
    fireEvent.change(newRoleNameInput, { target: { value: 'new_role' } });
    await waitFor(() => {
      expect(screen.getByDisplayValue('new_role')).toBeInTheDocument();
    });
  });

  it('Should be able to click the Search button, and check the endpoint function been called', async () => {
    render(<RoleEnvironmentComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(listClientRoles).toHaveBeenCalledTimes(1);
    });
  });

  it('Should be able to click the Delete Role button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(async () => {
      expect(await screen.findByTitle('Delete Role')).toBeInTheDocument();
    });
  });

  it('Should be able to click the User Details button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role1' }));
    });
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'user01' }));
    });

    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(1);
    });
    fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    fireEvent.click(screen.getByRole('img', { name: 'User Detail' }));
    expect(await screen.findByTitle('Additional User Info')).toBeVisible();
  });

  it('Should be able to click the Remove User button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });

    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('tab', { name: 'Users' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });

    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('tab', { name: 'Service Accounts' }));
    });
    await waitFor(() => {
      expect(listRoleUsers).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText(sampleRequest.projectName as string)).toBeTruthy();
    });
  });

  it('Should be able to click the remove service account button, and corresponding modal showing up', async () => {
    render(<RoleEnvironmentComponent />);
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });

    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('tab', { name: 'Service Accounts' }));
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
    fireEvent.click(await screen.findByRole('button', { name: 'Search' }));
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });

    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('tab', { name: 'Composite Roles' }));
    });
    await waitFor(() => {
      expect(screen.getByText('Select the roles to be nested under the Parent role')).toBeTruthy();
    });
    expect(getCompositeClientRoles).toHaveBeenCalled();
    expect(screen.getByText('compositeRole1')).toBeTruthy();
    expect(screen.getByText('compositeRole2')).toBeTruthy();
  });
});
