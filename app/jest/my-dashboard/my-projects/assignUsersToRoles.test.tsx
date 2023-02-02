import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { searchKeycloakUsers } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';

jest.mock('services/keycloak', () => ({
  searchKeycloakUsers: jest.fn(() =>
    Promise.resolve([
      {
        count: 1,
        rows: [
          {
            username: '000000001@idir',
            firstName: 'fn',
            lastName: 'ln',
            email: 'sampleResult@gov.bc.ca',
            attributes: { idir_userid: ['000000001'], displayName: ['sample_name'] },
          },
        ],
      },
      null,
    ]),
  ),
  listClientRoles: jest.fn(() => Promise.resolve([['role1'], null])),
  listUserRoles: jest.fn(() => Promise.resolve([['role1'], null])),
}));

jest.mock('services/bceid-webservice', () => ({
  searchIdirUsers: jest.fn(() =>
    Promise.resolve([
      {
        guid: '000000001',
        userId: 'userId',
        displayName: 'displayName',
        contact: { email: 'email@gov.bc.ca', telephone: '' },
        individualIdentity: { name: { firstname: '', middleName: '', otherMiddleName: '', surname: '', initials: '' } },
        internalIdentity: {
          title: '',
          company: '',
          department: '',
          description: '',
          employeeId: '',
          office: '',
          organizationCode: '',
        },
      },
      null,
    ]),
  ),
}));

describe('assign user to roles tab', () => {
  it('Should display correct property options from the drop-down box', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    expect(screen.getByRole('option', { name: 'Dev' }));
    expect(screen.getByRole('option', { name: 'Test' }));
    expect(screen.getByRole('option', { name: 'IDIR' }));
    expect(screen.getByRole('option', { name: 'Email' }));
  });

  it('Should be able to input some keywords in the Search Criteria input field', () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest }} />);
    const searchInput = screen.getByRole('textbox');
    fireEvent.change(searchInput, { target: { value: 'sample_input' } });
    expect(screen.getByDisplayValue('sample_input')).toBeInTheDocument();
  });

  it('Should be able to list search results, after click on the Search button; Should be able to click the View button for listed search result, and corresponding modal showing up', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    const searchUserInput = screen.getByRole('textbox');
    fireEvent.change(await searchUserInput, { target: { value: 'sample_user' } });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    expect(searchKeycloakUsers).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByRole('row', { name: 'fn ln sampleResult@gov.bc.ca View' }));
    });

    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByTitle('Additional User Info')).toBeVisible();
  });

  it('Should be able to click the Search in IDIM button, and corresponding modal showing up', async () => {
    render(
      <UserRoles
        selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir', 'bceidbasic'] }}
      />,
    );
    const searchUserInput = screen.getByRole('textbox');
    fireEvent.change(await searchUserInput, { target: { value: 'sample_user' } });

    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Search in IDIM Web Service Lookup' }));
    });
    expect(screen.getByTitle('IDIM Web Service Lookup')).toBeVisible();

    // await waitFor(() => { expect(screen.getByRole('row', {name:'First name Last Name Email IDIR username'})); });
    // expect(screen.getByText('The user you searched for does not exist. Please try again, by entering the full search criteria.'));

    // const idpBCeIDOption = screen.getByRole('textbox', { name: 'Basic BCeID' });
    // fireEvent.change(await idpBCeIDOption, { target: { value: 'Basic BCeID' } });
    // await waitFor(() => { fireEvent.click(screen.getByRole('button', { name: 'Import' })); });
  });
});
