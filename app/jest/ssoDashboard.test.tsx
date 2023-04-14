import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from 'pages/admin-dashboard';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';
import { deleteRequest, updateRequestMetadata, updateRequest } from 'services/request';
import { getEvents } from 'services/event';

const sampleSession = {
  email: '',
  isAdmin: true,
};

function MockRequestAllResult() {
  let requestAllResult: Integration[] = [];
  for (let i = 1; i <= 6; i++) {
    requestAllResult.push({
      ...sampleRequest,
      id: i,
      projectName: `project_name_${i}`,
      status: 'applied',
      serviceType: 'gold',
      environments: ['dev', 'prod'],
      devIdps: ['bceidbasic', 'githubpublic'],
    });
  }
  return requestAllResult;
}

const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
}));

jest.mock('services/request', () => {
  return {
    getRequestAll: jest.fn(() => Promise.resolve([{ count: 6, rows: MockRequestAllResult() }, null])),
    deleteRequest: jest.fn(() => Promise.resolve([[''], null])),
    updateRequestMetadata: jest.fn(() => Promise.resolve([[], null])),
    updateRequest: jest.fn(() => Promise.resolve([[], null])),
  };
});

jest.mock('services/event', () => {
  return {
    getEvents: jest.fn(() => Promise.resolve([[], null])),
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
    fireEvent.change(searchInputField, { target: { value: 'project_name' } });
    expect(searchInputField).toHaveDisplayValue('project_name');

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
      expect(screen.getByText('Project Name')).toBeInTheDocument();
      expect(screen.getByText('Request Status')).toBeInTheDocument();
      expect(screen.getByText('File Status')).toBeInTheDocument();
      expect(screen.getAllByText('Service Type'));
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    const firstRow = screen.getByRole('row', {
      name: '1 project_name_1 Applied Active Gold Events Edit Delete',
    });
    fireEvent.click(firstRow);
    await waitFor(() => {
      expect(firstRow).toHaveClass('active');
    });
  });

  it('testing on attribute dropdown', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    //Environments dropdown
    const selectEnvironments = screen.getByRole('combobox', { name: 'Environments Select...' });
    fireEvent.keyDown(selectEnvironments as HTMLElement, { keyCode: 40 });
    await waitFor(async () => {
      fireEvent.click(await screen.findByText('Dev'));
    });
    expect(screen.getByRole('combobox', { name: 'Environments Dev' }));

    //IDPs dropdown
    const selectIDPs = screen.getByRole('combobox', { name: 'IDPs Select...' });
    fireEvent.keyDown(selectIDPs as HTMLElement, { keyCode: 40 });
    await waitFor(async () => {
      fireEvent.click(await screen.findByText('BCeID'));
    });
    expect(screen.getByRole('combobox', { name: 'IDPs BCeID' }));

    //Workflow Status dropdown
    const selectWorkflowStatus = screen.getByRole('combobox', { name: 'Workflow Status Select...' });
    fireEvent.keyDown(selectWorkflowStatus as HTMLElement, { keyCode: 40 });
    await waitFor(async () => {
      fireEvent.click(await screen.findByText('Draft'));
    });
    expect(screen.getByRole('combobox', { name: 'Workflow Status Draft' }));

    //Archive Status dropdown
    const selectArchiveStatus = screen.getByRole('combobox', { name: 'Archive Status Select...' });
    fireEvent.keyDown(selectArchiveStatus as HTMLElement, { keyCode: 40 });
    await waitFor(async () => {
      fireEvent.click(await screen.findByText('Deleted'));
    });
    expect(screen.getByRole('combobox', { name: 'Archive Status Deleted' }));

    //Service Type dropdown
    const selectServiceType = screen.getByRole('combobox', { name: 'Service Type Select...' });
    fireEvent.keyDown(selectServiceType as HTMLElement, { keyCode: 40 });
    await waitFor(async () => {
      fireEvent.click(await screen.findByText('Silver'));
    });
    expect(screen.getByRole('combobox', { name: 'Service Type Silver' }));
  });

  it('testing Action buttons', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    const searchInputField = screen.getByPlaceholderText('Project ID or Name');
    expect(searchInputField).toBeInTheDocument();
    fireEvent.change(searchInputField, { target: { value: 'project_name' } });
    expect(searchInputField).toHaveDisplayValue('project_name');

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    //click on row
    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    const firstRow = screen.getByRole('row', {
      name: '1 project_name_1 Applied Active Gold Events Edit Delete',
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
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    expect(screen.getByText('5 per page')).toBeInTheDocument();
    expect(screen.getByText('1 of 2')).toBeInTheDocument();

    //click on Next button
    const nextButton = screen.getByRole('button', { name: 'Next' });
    fireEvent.click(nextButton);
    expect(screen.getByText('2 of 2')).toBeInTheDocument();

    //click on Previous button
    const previousButton = screen.getByRole('button', { name: 'Previous' });
    fireEvent.click(previousButton);
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
  });

  it('testing on Details tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    const firstRow = screen.getByRole('row', { name: '1 project_name_1 Applied Active Gold Events Edit Delete' });
    fireEvent.click(firstRow);

    //open the tabpanel
    const detailsTabPanel = screen.getByRole('tabpanel', { name: 'Details' });
    fireEvent.click(detailsTabPanel);
    await waitFor(() => {
      expect(detailsTabPanel).toHaveClass('rc-tabs-tabpane-active');
    });

    //open the modal
    const editMetadataButton = screen.getByRole('button', { name: 'Edit Metadata' });
    fireEvent.click(editMetadataButton);
    expect(screen.getByTitle('Edit Metadata'));

    //change selection value
    const statusSelection = screen.getByLabelText('Integration Status');
    expect(statusSelection).toHaveTextContent('Applied');
    fireEvent.change(statusSelection, { target: { value: 'Draft' } });
    await waitFor(() => {
      expect(statusSelection).toHaveTextContent('Draft');
    });

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequestMetadata).toHaveBeenCalled();
  });

  it('testing on Events tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    const firstRow = screen.getByRole('row', { name: '1 project_name_1 Applied Active Gold Events Edit Delete' });
    fireEvent.click(firstRow);

    //open the tabpanel
    const eventsTabPanel = screen.getByRole('tab', { name: 'Events' });
    fireEvent.click(eventsTabPanel);

    //test on selection dropdown
    const eventsDropdown = screen.getByTestId('events-dropdown');
    expect(eventsDropdown).toHaveTextContent('All Events');
    fireEvent.change(eventsDropdown, { target: { value: 'REQUEST_PR_SUCCESS' } });
    expect(eventsDropdown).toHaveTextContent('REQUEST_PR_SUCCESS');
    //expect(asFragment()).toMatchSnapshot();
  });

  it('testing on BCeID Prod tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    const firstRow = screen.getByRole('row', { name: '1 project_name_1 Applied Active Gold Events Edit Delete' });
    fireEvent.click(firstRow);

    //open the tabpanel
    const BCeIDProdTabPanel = screen.getByRole('tab', { name: 'BCeID Prod' });
    fireEvent.click(BCeIDProdTabPanel);

    //open the modal
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByTitle('Bceid Approve'));

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
  });

  it('testing on GitHub Prod tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      expect(screen.getByText('Request ID')).toBeInTheDocument();
    });
    const firstRow = screen.getByRole('row', { name: '1 project_name_1 Applied Active Gold Events Edit Delete' });
    fireEvent.click(firstRow);

    //open the tabpanel
    const GitHubProdTabPanel = screen.getByRole('tab', { name: 'GitHub Prod' });
    fireEvent.click(GitHubProdTabPanel);

    //open the modal
    const approveProdButton = screen.getByRole('button', { name: 'Approve Prod' });
    fireEvent.click(approveProdButton);
    expect(screen.getByTitle('Github Approve'));

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequest).toHaveBeenCalled();
  });
});
