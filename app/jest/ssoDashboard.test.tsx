import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from 'pages/admin-dashboard';
import { Integration } from 'interfaces/Request';
import { sampleRequest } from './samples/integrations';
import { deleteRequest, updateRequestMetadata, updateRequest, restoreRequest, getRequestAll } from 'services/request';
import BcServicesCardTabContent from 'page-partials/admin-dashboard/AdminTabs/BcServicesCardTabContent';

import { getCompositeClientRoles } from '@app/services/keycloak';
import { debug } from 'jest-preview';

const MOCK_PRIVACY_ZONE_URI = 'uniqueZoneUri';
const MOCK_PRIVACY_ZONE_NAME = 'uniqueZoneName';

const sampleSession = {
  email: '',
  isAdmin: true,
};

const MOCK_EMAIL = 'some@email.com';

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
      devIdps: ['bceidbasic', 'githubpublic', 'bcservicescard'],
      authType: 'both',
    });
  }
  requestAllResult.push({
    ...sampleRequest,
    id: 7,
    projectName: `project_name_7`,
    status: 'applied',
    archived: true,
    serviceType: 'gold',
    environments: ['dev', 'prod'],
    devIdps: ['bceidbasic', 'githubpublic', 'bcservicescard'],
  });
  return requestAllResult;
}

const spyUseRouter = jest.spyOn(require('next/router'), 'useRouter').mockImplementation(() => ({
  pathname: '',
  query: '',
  push: jest.fn(() => Promise.resolve(true)),
}));

const mockResult = () => {
  return {
    ...sampleRequest,
    id: 1,
    projectName: `project_name_1`,
    status: 'applied',
    serviceType: 'gold',
    environments: ['dev', 'prod'],
    devIdps: ['bceidbasic', 'githubpublic', 'bcservicescard'],
  };
};

jest.mock('services/request', () => {
  return {
    getRequestAll: jest.fn(() => Promise.resolve([{ count: 6, rows: MockRequestAllResult() }, null])),
    deleteRequest: jest.fn(() => Promise.resolve([[''], null])),
    updateRequestMetadata: jest.fn(() => Promise.resolve([[], null])),
    updateRequest: jest.fn(() => Promise.resolve([[], null])),
    restoreRequest: jest.fn(() => Promise.resolve([[''], null])),
    getRequest: jest.fn(() => Promise.resolve([mockResult(), null])),
  };
});

jest.mock('services/event', () => {
  return {
    getEvents: jest.fn(() => Promise.resolve([[], null])),
  };
});

jest.mock('services/user', () => {
  return {
    getIdirUsersByEmail: jest.fn(() => Promise.resolve([[{ mail: MOCK_EMAIL, id: 1 }]])),
  };
});

jest.mock('services/bc-services-card', () => {
  return {
    ...jest.requireActual('services/bc-services-card'),
    fetchPrivacyZones: jest.fn(() =>
      Promise.resolve([[{ privacy_zone_uri: MOCK_PRIVACY_ZONE_URI, privacy_zone_name: MOCK_PRIVACY_ZONE_NAME }]]),
    ),
  };
});

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([[{ name: 'role-1' }, { name: 'role-2' }], null])),
  listComposites: jest.fn(() => Promise.resolve([[false, false], null])),
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
  bulkCreateRole: jest.fn(() => Promise.resolve([{}, null])),
}));

const getFirstRow = () => {
  return screen.getByRole('row', {
    name: '1 project_name_1 Applied Active Events Edit Delete from Keycloak Restore at Keycloak',
  });
};

describe('SSO Dashboard', () => {
  const SEARCH_PLACEHOLDER = 'Project ID, Project Name or Client ID';
  it('should match all table headers, dropdown headings; testing on input field, search button', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    expect(screen.getByText('Environments')).toBeInTheDocument();
    expect(screen.getByText('IDPs')).toBeInTheDocument();
    expect(screen.getByText('Workflow Status')).toBeInTheDocument();
    expect(screen.getByText('Archive Status')).toBeInTheDocument();

    const searchInputField = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
    expect(searchInputField).toBeInTheDocument();
    fireEvent.change(searchInputField, { target: { value: 'project_name' } });
    expect(searchInputField).toHaveDisplayValue('project_name');

    const searchButton = screen.getByRole('button', { name: 'Search' });
    fireEvent.click(searchButton);

    expect(screen.getByText('Request ID')).toBeInTheDocument();
    expect(screen.getByText('Project Name')).toBeInTheDocument();
    expect(screen.getByText('Request Status')).toBeInTheDocument();
    expect(screen.getByText('File Status')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();

    await waitFor(() => {
      screen.getByText('project_name_1');
    });

    fireEvent.click(getFirstRow());

    await waitFor(() => {
      expect(getFirstRow()).toHaveClass('active');
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

    //Workflow Status dropdown
    const selectWorkflowStatus = screen.getAllByTestId('multi-select-col-filter');
    const workflowStatusInput = selectWorkflowStatus[1].firstChild;
    fireEvent.keyDown(workflowStatusInput as HTMLElement, { keyCode: 40 });
    const workflowStatusOption = await screen.findByRole('option', { name: 'Submitted' });
    fireEvent.click(workflowStatusOption);
    expect(selectWorkflowStatus[1]).toHaveTextContent('Submitted');

    //Archive Status dropdown
    const selectArchiveStatus = screen.getAllByTestId('multi-select-col-filter');
    const archiveStatusInput = selectArchiveStatus[2].firstChild;
    fireEvent.keyDown(archiveStatusInput as HTMLElement, { keyCode: 40 });
    const archiveStatusOption = await screen.findByText('Active');
    fireEvent.click(archiveStatusOption);
    expect(selectArchiveStatus[2]).toHaveTextContent('Active');

    //IDPs dropdown
    const selectIDPs = screen.getAllByTestId('multi-select-col-filter');
    const idpInput = selectIDPs[3].firstChild;
    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findByText('BCeID');
    fireEvent.click(idpOption);
    expect(selectIDPs[3]).toHaveTextContent('BCeID');
  });

  it('testing Action buttons', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    const searchInputField = screen.getByPlaceholderText(SEARCH_PLACEHOLDER);
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
      name: '1 project_name_1 Applied Active Events Edit Delete from Keycloak Restore at Keycloak',
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
    const deleteButton = screen.getAllByRole('button', { name: 'Delete from Keycloak' });
    fireEvent.click(deleteButton[0]);

    await waitFor(() => {
      expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
    });
    const confirmDeleteButton = screen.getByTestId('confirm-delete-confirm-deletion');

    await waitFor(() => {
      const confirmationInput = screen.getByTestId('delete-confirmation-input');
      fireEvent.change(confirmationInput, { target: { value: 'project_name_1' } });
    });

    fireEvent.click(confirmDeleteButton);
    await waitFor(() => {
      expect(deleteRequest).toHaveBeenCalled();
      expect(screen.queryByText('Confirm Deletion')).toBeNull();
    });

    const restoreButtons = screen.getAllByRole('button', { name: 'Restore at Keycloak' });
    fireEvent.click(restoreButtons[6]);

    let restorationModal: HTMLElement | null;

    await waitFor(() => {
      restorationModal = screen.getByText('Confirm Restoration');
      expect(restorationModal).toBeInTheDocument();
    });

    const userSearch = document.querySelector('#restoration-email-select input') as Element;
    fireEvent.change(userSearch, { target: { value: MOCK_EMAIL } });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('option', { name: MOCK_EMAIL }));
    });

    const confirmRestoreButton = screen.getAllByTestId('confirm-delete-confirm-restoration');
    fireEvent.click(confirmRestoreButton[0]);
    await waitFor(() => {
      expect(restoreRequest).toHaveBeenCalled();
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

    fireEvent.click(getFirstRow());

    //open the tabpanel
    const detailsTabPanel = screen.getByRole('tabpanel', { name: 'Details' });
    fireEvent.click(detailsTabPanel);
    await waitFor(() => {
      expect(detailsTabPanel).toHaveClass('rc-tabs-tabpane-active');
    });

    //open the modal
    const editMetadataButton = screen.getByTestId('edit-metadata-button');
    fireEvent.click(editMetadataButton);

    //change selection value
    const statusSelection = screen.getByTestId('integration-status');
    const input = statusSelection.lastChild;
    //expect(input).toHaveTextContent('Select...');
    fireEvent.keyDown(input as HTMLElement, { keyCode: 40 });
    const option = await screen.findByText('Submitted');
    fireEvent.click(option);
    expect(input).toHaveTextContent('Submitted');

    //test on confirm button
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(updateRequestMetadata).toHaveBeenCalled();
  });

  const bcscRequest = {
    ...sampleRequest,
    projectName: 'testProject',
    devIdps: ['bcservicescard'],
    bcscPrivacyZone: MOCK_PRIVACY_ZONE_URI,
  };

  it('Displays the privacy zone name in the request details for BCSC integrations', async () => {
    (getRequestAll as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve([
        {
          count: 1,
          rows: [bcscRequest],
        },
      ]);
    });
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);
    await waitFor(() => {
      screen.getByText('testProject');
    });

    const firstRow = screen.getByText('testProject');
    fireEvent.click(firstRow);
    const privacyZoneElement = screen.queryByText('Privacy Zone:');
    expect(privacyZoneElement).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(bcscRequest.bcscPrivacyZone)).toBeInTheDocument();
    });
  });

  it('Does not display the privacy zone name in the request details for other integrations', async () => {
    (getRequestAll as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve([
        { count: 1, rows: [{ ...sampleRequest, projectName: 'testProject', devIdps: ['idir'] }] },
      ]);
    });
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);
    await waitFor(() => {
      screen.getByText('testProject');
    });
    const firstRow = screen.getByText('testProject');
    fireEvent.click(firstRow);
    const privacyZoneElement = screen.queryByText('Privacy Zone:');
    expect(privacyZoneElement).not.toBeInTheDocument();
  });

  it('testing on Events tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      screen.getByText('project_name_1');
    });
    fireEvent.click(getFirstRow());

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

  it('testing on roles tab', async () => {
    render(<AdminDashboard session={sampleSession} onLoginClick={jest.fn} onLogoutClick={jest.fn} />);

    await waitFor(() => {
      screen.getByText('project_name_1');
    });
    fireEvent.click(getFirstRow());

    fireEvent.click(screen.getByRole('tab', { name: 'Roles' }));

    await waitFor(() => {
      expect(screen.getByText('Role Name')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    });

    //double click to make it active only for tests
    await waitFor(() => {
      fireEvent.click(screen.getByRole('cell', { name: 'role-1' }));
    });

    // delete icon is not available for sso admins
    await waitFor(() => {
      expect(screen.getByRole('cell', { name: 'role-1' }).nextSibling?.lastChild).toBeNull();
    });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Users' }));
    });

    expect(screen.queryByText('Remove User')).not.toBeInTheDocument();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Composite Roles' }));
    });

    expect(getCompositeClientRoles).toHaveBeenCalled();
    expect(screen.getByText('compositeRole1')).toBeTruthy();
    expect(screen.getByText('compositeRole2')).toBeTruthy();

    await waitFor(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Service Accounts' }));
    });

    expect(screen.queryByText('Remove Service Account')).not.toBeInTheDocument();
  });

  it('BCSC Tab can approve submitted bcsc integrations', () => {
    const bcServicesCardIntegration: Integration = {
      ...sampleRequest,
      devIdps: ['bcservicescard'],
      status: 'applied',
      publicAccess: false,
    };

    render(<BcServicesCardTabContent integration={bcServicesCardIntegration} />);
    const textElement = screen.getByText('To begin the BC Services Card integration in production, Click Below.');
    expect(textElement).toBeInTheDocument();
  });

  it('BCSC Tab cannot approve archived bcsc integrations', () => {
    const bcServicesCardIntegrationArchived: Integration = {
      ...sampleRequest,
      devIdps: ['bcservicescard'],
      status: 'applied',
      archived: true,
      publicAccess: false,
    };

    render(<BcServicesCardTabContent integration={bcServicesCardIntegrationArchived} />);
    const textElement = screen.getByText('Cannot approve deleted/archived integrations.');
    expect(textElement).toBeInTheDocument();
  });
});
