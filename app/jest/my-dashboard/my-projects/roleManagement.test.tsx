import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import { listClientRoles, listRoleUsers, getCompositeClientRoles, manageUserRole } from 'services/keycloak';

const mockResult = () => {
  return { ...sampleRequest, authType: 'both' };
};

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
      expect(screen.getByRole('columnheader', { name: 'Role Name' })).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('role1'));
    });
    expect(screen.getByPlaceholderText('Search existing roles'));
  });

  it('Should be able to input keywords in Search Existing Role input field', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    const searchRoleInput = screen.findByRole('textbox');
    fireEvent.change(await searchRoleInput, { target: { value: 'sample_role' } });
    expect(screen.getByDisplayValue('sample_role')).toBeInTheDocument();
  });

  it('Should be able to input keywords in Create New Role input field', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('+ Create a New Role'));
    });
    const newRoleNameInput = screen.findByTestId('role-name-input-field');
    fireEvent.change(await newRoleNameInput, { target: { value: 'new_role' } });
    expect(screen.getByDisplayValue('new_role')).toBeInTheDocument();
  });

  it('Should be able to click the Search button, and check the endpoint function been called', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Search'));
    });
    expect(listClientRoles).toHaveBeenCalledTimes(1);
  });

  it('Should be able to click the Delete Role button, and corresponding modal showing up', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByLabelText('delete'));
    });
    expect(screen.findByText('Delete Role')).toBeTruthy();
  });

  it('Should be able to click the User Details button, and corresponding modal showing up', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    expect(listRoleUsers).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText('user01')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('img', { name: 'User Detail' }));
    expect(screen.getByText('Additional User Info')).toBeVisible();
  });

  it('Should be able to click the Remove User button, and corresponding modal showing up', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    await waitFor(() => {
      expect(screen.getByText('user01')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('img', { name: 'Remove User' }));
    expect(screen.getByText('Remove User from Role')).toBeVisible();
    fireEvent.click(screen.getByTestId('modal-confirm-btn-remove-user'));
    expect(manageUserRole).toHaveBeenCalledTimes(1);
  });

  it('Should be able to show service accounts assigned to a role inside service accounts tab', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Service Accounts'));
    });
    expect(listRoleUsers).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByText(sampleRequest.projectName as string)).toBeTruthy();
    });
  });

  it('Should be able to click the remove service account button, and corresponding modal showing up', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Service Accounts'));
    });
    expect(listRoleUsers).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText(sampleRequest.projectName as string)).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('img', { name: 'Remove Service Account' }));
    expect(screen.getByText('Remove Service Account from Role')).toBeVisible();
    fireEvent.click(screen.getByTestId('modal-confirm-btn-remove-service-account'));
    expect(manageUserRole).toHaveBeenCalledTimes(1);
  });

  it('Should be able to show all existing composite roles, after clicking on the Composite Roles tab', async () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('role1'));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByText('Composite Roles'));
    });

    expect(screen.getByText('Select the roles to be nested under the Parent role')).toBeTruthy();
    expect(getCompositeClientRoles).toHaveBeenCalled();
    expect(screen.getByText('compositeRole1')).toBeTruthy();
    expect(screen.getByText('compositeRole2')).toBeTruthy();
  });
});
