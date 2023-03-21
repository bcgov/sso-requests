import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from 'pages/admin-dashboard';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';
import { deleteRequest } from 'services/request';

const sampleSession = {
  email: '',
  isAdmin: true,
};

const mockRequestAllResult: Integration[] = [
  { ...sampleRequest, id: 1, projectName: 'project_name_1', status: 'applied', serviceType: 'gold' },
  { ...sampleRequest, id: 2, projectName: 'project_name_2', status: 'applied', serviceType: 'gold' },
  { ...sampleRequest, id: 3, projectName: 'project_name_3', status: 'applied', serviceType: 'gold' },
  { ...sampleRequest, id: 4, projectName: 'project_name_4', status: 'applied', serviceType: 'gold' },
  { ...sampleRequest, id: 5, projectName: 'project_name_5', status: 'applied', serviceType: 'gold' },
  { ...sampleRequest, id: 6, projectName: 'project_name_6', status: 'applied', serviceType: 'gold' },
];

const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('services/request', () => {
  return {
    getRequestAll: jest.fn(() => Promise.resolve([{ count: 6, rows: mockRequestAllResult }, null])),
    deleteRequest: jest.fn(() => Promise.resolve([[''], null])),
  };
});

describe('SSO Dashboard', () => {
  it('should match all table headers, dropdown headings; testing on input field, search button', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    expect(screen.getByText('Environments')).toBeInTheDocument();
    expect(screen.getByText('IDPs')).toBeInTheDocument();
    expect(screen.getByText('Workflow Status')).toBeInTheDocument();
    expect(screen.getByText('Archive Status')).toBeInTheDocument();
    expect(screen.getAllByText('Service Type'));

    const searchInputField = screen.getByPlaceholderText('Project ID or Name');
    expect(searchInputField).toBeInTheDocument();
    fireEvent.change(searchInputField, { target: { value: 'sample_input' } });
    expect(searchInputField).toHaveDisplayValue('sample_input');

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: 'Request ID Project Name Request Status File Status Service Type Actions' }),
      );
    });
    const firstRow = screen.getByRole('row', {
      name: '00000001 project_name_1 Applied Active Gold Events Edit Delete',
    });
    fireEvent.click(firstRow);
    await waitFor(() => {
      expect(firstRow).toHaveClass('active');
    });

    //click on dropdown input
    // await waitFor(() => { screen.getByLabelText('Select', {selector: 'div'}) });
    // expect(asFragment()).toMatchSnapshot();
  });

  it('testing Action buttons', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    const searchInputField = screen.getByPlaceholderText('Project ID or Name');
    expect(searchInputField).toBeInTheDocument();
    fireEvent.change(searchInputField, { target: { value: 'sample_input' } });
    expect(searchInputField).toHaveDisplayValue('sample_input');

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    //click on row
    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: 'Request ID Project Name Request Status File Status Service Type Actions' }),
      );
    });
    const firstRow = screen.getByRole('row', {
      name: '00000001 project_name_1 Applied Active Gold Events Edit Delete',
    });
    fireEvent.click(firstRow);
    await waitFor(() => {
      expect(firstRow).toHaveClass('active');
    });

    //click on eye icon
    const eventsButton = screen.getAllByRole('button', { name: 'Events' });
    fireEvent.click(eventsButton[0]);
    await waitFor(() => {
      expect(screen.getByRole('tabpanel', { name: 'Events' })).toHaveClass('rc-tabs-tabpane-active');
    });

    //click on edit icon
    const editButton = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButton[0]);
    await waitFor(() => {
      expect(spyUseRouter).toHaveBeenCalled();
    });

    //click on delete icon
    const deleteButton = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButton[0]);
    await waitFor(() => {
      expect(screen.getByTitle('Confirm Deletion')).toBeInTheDocument();
    });
    const confirmDeleteButton = screen.getAllByTestId('confirm-delete');
    fireEvent.click(confirmDeleteButton[1]);
    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalled();
    });
  });

  it('testing on pagination buttons', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      expect(
        screen.getByRole('row', { name: 'Request ID Project Name Request Status File Status Service Type Actions' }),
      );
    });
    expect(screen.getByText('5 per page')).toBeInTheDocument();
    expect(screen.getByText('10 per page')).toBeInTheDocument();
    expect(screen.getByText('1-5 of 6')).toBeInTheDocument();

    //click on Next button
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);
    expect(screen.getByText('6-6 of 6')).toBeInTheDocument();

    //click on Previous button
    const previousButton = screen.getByRole('button', { name: 'Previous' });
    fireEvent.click(previousButton);
    expect(screen.getByText('1-5 of 6')).toBeInTheDocument();

    //change page option
    // const tenPerPage = screen.getByRole('option', {name:'10 per page'});
    // fireEvent.change(tenPerPage);
    // await waitFor(() => { expect(screen.getByText('1-6 of 6')).toBeInTheDocument() });
    // expect(screen.getByRole('option')).toHaveDisplayValue('10 per page');
  });
});
