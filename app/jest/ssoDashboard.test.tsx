import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from 'pages/admin-dashboard';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';
import { deleteRequest, updateRequestMetadata, updateRequest } from 'services/request';

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

    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Request Status')).toBeInTheDocument();
    expect(screen.getByText('File Status')).toBeInTheDocument();
    expect(screen.getAllByText('Service Type'));
    expect(screen.getByText('Actions')).toBeInTheDocument();

    await waitFor(() => {
      screen.getByText('project_name_1');
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
    const selectEnvironments = screen.getAllByTestId('multi-select-col-filter');
    const envInput = selectEnvironments[0].firstChild;
    fireEvent.keyDown(envInput as HTMLElement, { keyCode: 40 });
    const envOption = await screen.findByText('Test');
    fireEvent.click(envOption);
    expect(selectEnvironments[0]).toHaveTextContent('Test');

    //IDPs dropdown
    const selectIDPs = screen.getAllByTestId('multi-select-col-filter');
    const idpInput = selectIDPs[1].firstChild;
    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findByText('BCeID');
    fireEvent.click(idpOption);
    expect(selectIDPs[1]).toHaveTextContent('BCeID');

    //Workflow Status dropdown
    const selectWorkflowStatus = screen.getAllByTestId('multi-select-col-filter');
    const workflowStatusInput = selectWorkflowStatus[2].firstChild;
    fireEvent.keyDown(workflowStatusInput as HTMLElement, { keyCode: 40 });
    const workflowStatusOption = await screen.findByText('Draft');
    fireEvent.click(workflowStatusOption);
    expect(selectWorkflowStatus[2]).toHaveTextContent('Draft');

    //Archive Status dropdown
    const selectArchiveStatus = screen.getAllByTestId('multi-select-col-filter');
    const archiveStatusInput = selectArchiveStatus[3].firstChild;
    fireEvent.keyDown(archiveStatusInput as HTMLElement, { keyCode: 40 });
    const archiveStatusOption = await screen.findByText('Active');
    fireEvent.click(archiveStatusOption);
    expect(selectArchiveStatus[3]).toHaveTextContent('Active');

    //Service Type dropdown
    const selectServiceType = screen.getAllByTestId('multi-select-col-filter');
    const serviceTypeInput = selectServiceType[4].firstChild;
    fireEvent.keyDown(serviceTypeInput as HTMLElement, { keyCode: 40 });
    const serviceTypeOption = await screen.findByText('Gold');
    fireEvent.click(serviceTypeOption);
    expect(selectServiceType[4]).toHaveTextContent('Gold');
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
      screen.getByText('project_name_1');
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
      screen.getByText('project_name_1');
    });
    const pageSelection = screen.getByTestId('page-select');
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

    //select page limit
    const input = pageSelection.firstChild;
    fireEvent.keyDown(input as HTMLElement, { keyCode: 40 });
    const pageOption = await screen.findByText('10 per page');
    fireEvent.click(pageOption);
    expect(pageSelection).toHaveTextContent('10 per page');
    expect(screen.getByText('1 of 1')).toBeInTheDocument();
  });

  it('testing on Details tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      screen.getByText('project_name_1');
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
    await waitFor(() => {
      expect(screen.getByTitle('Edit Metadata'));
    });

    //change selection value
    const statusSelection = screen.getByTestId('integration-status');
    const input = statusSelection.lastChild;
    //expect(input).toHaveTextContent('Select...');
    fireEvent.keyDown(input as HTMLElement, { keyCode: 40 });
    const option = await screen.findByText('Draft');
    fireEvent.click(option);
    expect(input).toHaveTextContent('Draft');

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequestMetadata).toHaveBeenCalled();
  });

  it('testing on Events tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      screen.getByText('project_name_1');
    });
    const firstRow = screen.getByRole('row', { name: '1 project_name_1 Applied Active Gold Events Edit Delete' });
    fireEvent.click(firstRow);

    //open the tabpanel
    const eventsTabPanel = screen.getByRole('tab', { name: 'Events' });
    fireEvent.click(eventsTabPanel);

    //test on selection dropdown
    const eventsDropdown = screen.getByTestId('events-dropdown');
    const input = eventsDropdown.lastChild;
    //expect(eventsDropdown).toHaveTextContent('Select...');
    fireEvent.keyDown(input as HTMLElement, { keyCode: 40 });
    const eventOption = await screen.findByText('All Events');
    fireEvent.click(eventOption);
    expect(eventsDropdown).toHaveTextContent('All Events');
  });

  it('testing on BCeID Prod tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      screen.getByText('project_name_1');
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
      screen.getByText('project_name_1');
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
