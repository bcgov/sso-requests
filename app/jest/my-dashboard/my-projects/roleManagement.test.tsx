import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RoleManagement from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import RoleEnvironment from 'page-partials/my-dashboard/RoleManagement/RoleEnvironment';
import CreateRoleContent from 'page-partials/my-dashboard/RoleManagement';

const callBackFromSearch = jest.fn();

const searchButton = screen.queryByText('Search');
//screen.queryByTestId(`stage-1`)?.closest('div') as HTMLElement;

jest.mock('page-partials/my-dashboard/RoleManagement/RoleEnvironment', () => ({
  RoleEnvironment: jest.fn(),
}));

describe('role management tab', () => {
  it('should be able to click the create new role button', async () => {
    await render(<RoleManagement integration={{ ...sampleRequest }} />);
    expect(screen.getByText('+ Create a New Role')).toHaveStyle({ visibility: 'visible' });
    expect(screen.getByTitle('Create New Role')).toHaveStyle({ visibility: 'hidden' });

    //screen.logTestingPlaygroundURL();
    fireEvent.click(screen.getByText('+ Create a New Role'));

    expect(screen.getByRole('columnheader', { name: 'role name' })).toHaveStyle({ visibility: 'visible' });
    //expect(CreateRoleContent).toHaveBeenCalled();
    //expect(screen.getByText('Create New Role')).toHaveAttribute('disabled');
    //expect(screen.getByText('Role Name')).toHaveStyle({ visibility: 'visible' });
    //expect(screen.getByText('Create New Role')).toHaveStyle({ visibility: 'visible' });
    //expect(screen.getByText('Create New Role')).toBeVisible();

    //try other ways, rather than modal
    //selector: getBy, queryBy...   "getModal"
  });

  it('should match the display data', async () => {
    await render(<RoleManagement integration={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
    expect(screen.getByText('Dev')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Prod')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search existing roles')).toBeInTheDocument();
    expect(screen.findByTitle('Request ID')).toBeInTheDocument();
    expect(screen.findByPlaceholderText('No roles found.')).toBeInTheDocument();
  });

  it('should be able to input some keywords in the input field', async () => {
    await render(<RoleManagement integration={{ ...sampleRequest }} />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_role' } });
    expect(screen.getByDisplayValue('sample_role')).toBeInTheDocument();
  });

  it('click the Search button, and display loading image', async () => {
    await render(<RoleManagement integration={{ ...sampleRequest }} />);
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('grid-loading'));
    expect(RoleEnvironment).toHaveBeenCalled();
  });

  //mock function with sample data; find the calling function
});
