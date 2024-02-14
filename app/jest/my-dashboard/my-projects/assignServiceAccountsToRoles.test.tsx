import ServiceAccountRoles from '@app/page-partials/my-dashboard/ServiceAccountRoles';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { sampleRequest } from '@app/jest/samples/integrations';
import { formatWikiURL } from '@app/utils/text';

function ServiceAccountRolesComponent() {
  return (
    <ServiceAccountRoles
      selectedRequest={{
        ...sampleRequest,
        environments: ['dev', 'test', 'prod'],
        devIdps: [],
        testIdps: [],
        prodIdps: [],
        authType: 'both',
      }}
    />
  );
}

const listClientRolesResponse = 'role1';
const HYPERLINK = formatWikiURL('Creating-a-Role#service-account-role-management');

jest.mock('services/keycloak', () => ({
  listClientRoles: jest.fn(() => Promise.resolve([[{ name: listClientRolesResponse }], null])),
  listUserRoles: jest.fn(() => Promise.resolve([[], null])),
  manageUserRoles: jest.fn(() => Promise.resolve([true, null])),
}));

describe('assign service accounts to roles', () => {
  it('Should be able to display and close the notification about security risk', async () => {
    render(<ServiceAccountRolesComponent />);
    expect(screen.getByTestId('assign-svc-acct-role-risk-alert'));
  });

  it('Should match the correct table headers, external link address', () => {
    render(<ServiceAccountRolesComponent />);
    expect(screen.getByText('Service Account')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'click to visit our wiki page' })).toHaveAttribute('href', HYPERLINK);
  });

  it('Should be able to switch between environments', async () => {
    render(<ServiceAccountRolesComponent />);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Dev'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Prod'));
    });

    await waitFor(() => {
      fireEvent.click(screen.getByText('Test'));
    });
  });

  it('Should display the table with service account name', () => {
    render(<ServiceAccountRolesComponent />);
    expect(screen.getByText(sampleRequest.projectName as string));
  });

  it('Should display correct property options from the drop-down box', async () => {
    const { getByTestId } = render(<ServiceAccountRolesComponent />);

    await waitFor(() => {
      expect(screen.getByText('Assign Service Account to a Role')).toBeInTheDocument();
    });

    // step: 1 Opens the dropdown options list
    const selectWrapper = getByTestId('assign-svc-acct-to-role-select');
    const input = selectWrapper.firstChild;
    fireEvent.keyDown(input as HTMLElement, { keyCode: 40 });

    // step: 2 Selects the dropdown option and close the dropdown options list
    const option = await screen.findByText(listClientRolesResponse);
    await waitFor(() => {
      // its a label in options list
      fireEvent.click(option);
    });

    // step: 3 Check the selected value
    expect(getByTestId('assign-svc-acct-to-role-select')).toHaveTextContent(listClientRolesResponse);
  });
});
