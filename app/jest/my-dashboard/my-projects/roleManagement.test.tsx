import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ClientRoles from 'page-partials/my-dashboard/RoleManagement';
import { sampleRequest } from '../../samples/integrations';
import RoleEnvironment from 'page-partials/my-dashboard/RoleManagement';

const callBackFromSearch = jest.fn();

const searchButton = screen.queryByText('Search');
//screen.queryByTestId(`stage-1`)?.closest('div') as HTMLElement;

describe('role management tab', () => {
  it('should be able to click the create new role button', () => {
    render(<ClientRoles integration={{ ...sampleRequest }} />);
    expect(screen.getByText('+ Create a New Role')).toHaveStyle({ visibility: 'visible' });
    expect(screen.getByText('Create New Role')).toHaveStyle({ visibility: 'hidden' });

    fireEvent.click(screen.getByText('+ Create a New Role'));
    //expect(screen.getByText('Create New Role')).toHaveAttribute('disabled');
    //expect(screen.getByText('Role Name')).toHaveStyle({ visibility: 'visible' });
    //expect(screen.getByText('Create New Role')).toHaveStyle({ visibility: 'visible' });
    //expect(screen.getByText('Create New Role')).toBeVisible();
  });

  it('should match the display data', async () => {
    render(<ClientRoles integration={{ ...sampleRequest, environments: ['dev', 'test', 'prod'] }} />);
    expect(screen.getByText('Dev'));
    expect(screen.getByText('Test'));
    expect(screen.getByText('Prod'));
    expect(screen.getByPlaceholderText('Search existing roles'));
    expect(screen.findByTitle('Request ID'));
    expect(screen.findByPlaceholderText('No roles found.'));
  });

  it('should be able to input some keywords in the input field', () => {
    render(<ClientRoles integration={{ ...sampleRequest }} />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_role' } });
    expect(screen.getByDisplayValue('sample_role')).toBeInTheDocument();
  });

  it('click the Search button, and display loading image', async () => {
    render(<ClientRoles integration={{ ...sampleRequest }} />);
    fireEvent.click(screen.getByText('Search'));
    expect(screen.getByTestId('grid-loading'));
    await expect(callBackFromSearch).toHaveBeenCalled();
  });

  //mock function with sample data; find the calling function
});
