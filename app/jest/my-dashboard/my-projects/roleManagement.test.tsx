import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import { listClientRoles, KeycloakUser } from 'services/keycloak';

const mockClientRolesResult = ({ email, username, attributes }: KeycloakUser) => {
  return [(email = 'mockEmail@gov.bc.ca'), (username = 'mockUserName'), (attributes = null)];
};

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([[], null])),
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
      expect(screen.getByText('No roles found.'));
    });
    expect(screen.getByPlaceholderText('Search existing roles'));
    //await waitFor(() => { expect(screen.getByTestId('modal')); });
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

  //need further tests on role table
});
