import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import { listClientRoles, KeycloakUser } from 'services/keycloak';

const mockClientRolesResult = ({ email, username, attributes }: KeycloakUser) => {
  return [(email = 'mockEmail@gov.bc.ca'), (username = 'mockUserName'), (attributes = null)];
};

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([mockClientRolesResult, null])),
}));

describe('role management tab', () => {
  it('should match the display data', () => {
    render(<RoleManagement integration={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
    expect(screen.getByText('Dev'));
    expect(screen.getByText('Test'));
    expect(screen.getByText('Prod'));
    expect(screen.getByPlaceholderText('Search existing roles'));
    expect(screen.findByTitle('Request ID'));
    expect(screen.findByPlaceholderText('No roles found.'));
  });

  it('should be able to input some keywords in the input field', () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);

    fireEvent.click(screen.getByText('+ Create a New Role'));
    const roleNameInput = screen.getByRole('textbox');
    fireEvent.change(roleNameInput, { target: { value: 'new_role' } });
    expect(screen.getByDisplayValue('new_role')).toBeInTheDocument();

    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_role' } });
    expect(screen.getByDisplayValue('sample_role')).toBeInTheDocument();
  });

  it('click the Search button, will return the mock search result', () => {
    render(<RoleManagement integration={{ ...sampleRequest }} />);
    fireEvent.click(screen.getByText('Search'));
    expect(listClientRoles).toHaveBeenCalled();
  });
});
