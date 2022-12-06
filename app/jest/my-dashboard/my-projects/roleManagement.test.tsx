import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import fetchRoles from 'page-partials/my-dashboard/RoleManagement/RoleEnvironment';
import CreateRoleContent from 'page-partials/my-dashboard/RoleManagement';

// jest.mock('page-partials/my-dashboard/RoleManagement/RoleEnvironment', () => ({
//   fetchRoles: jest.fn(),
// }));

describe('role management tab', () => {
  it('should be able to click the create new role button', () => {
    render(<RoleManagement integration={{ ...sampleRequest, apiServiceAccount: false }} />);
    expect(screen.getByText('+ Create a New Role')).toHaveStyle({ visibility: 'visible' });
    expect(screen.getByTitle('Create New Role')).toHaveStyle({ visibility: 'hidden' });
    expect(screen.getByRole('button', { name: '+ Create a New Role' })).toHaveStyle({ disabled: 'false' });
    //screen.logTestingPlaygroundURL();
    fireEvent.click(screen.getByText('+ Create a New Role'));

    //screen.logTestingPlaygroundURL();
    expect(screen.getByTitle('Create New Role')).toBeVisible();

    //try other ways, rather than modal
    //selector: getBy, queryBy...   "getModal"
  });

  // it('should match the display data', () => {
  //   render(<RoleManagement integration={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
  //   expect(screen.getByText('Dev'));
  //   expect(screen.getByText('Test'));
  //   expect(screen.getByText('Prod'));
  //   expect(screen.getByPlaceholderText('Search existing roles'));
  //   expect(screen.findByTitle('Request ID'));
  //   expect(screen.findByPlaceholderText('No roles found.'));
  // });

  // it('should be able to input some keywords in the input field', () => {
  //   render(<RoleManagement integration={{ ...sampleRequest }} />);
  //   const searchInput = screen.getByRole('textbox');
  //   fireEvent.change(searchInput, { target: { value: 'sample_role' } });
  //   expect(screen.getByDisplayValue('sample_role')).toBeInTheDocument();
  // });

  // it('click the Search button, will return the mock search result', () => {
  //   render(<RoleManagement integration={{ ...sampleRequest }} />);
  //   fireEvent.click(screen.getByText('Search'));
  //   expect(fetchRoles).toHaveBeenCalled();
  // });
});
