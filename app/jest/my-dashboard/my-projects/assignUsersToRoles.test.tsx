import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { searchKeycloakUsers } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';
import IdimLookup from 'page-partials/my-dashboard/users-roles/IdimLookup';
import { searchIdirUsers } from 'services/bceid-webservice';

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
        contact: { email: 'idim_email@gov.bc.ca', telephone: '' },
        individualIdentity: {
          name: { firstname: 'fn', middleName: '', otherMiddleName: '', surname: 'ln', initials: '' },
        },
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
  it('Should be able to list search results, after click on the Search button; Should be able to click the View button for listed search result, and corresponding modal showing up', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'Dev' }));
    });
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'IDIR' }));
    });
    await waitFor(async () => {
      fireEvent.click(await screen.findByRole('option', { name: 'Email' }));
    });

    const searchUserInput = screen.getByRole('textbox');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });
    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
    });
    screen.findByRole('row', { name: 'fn ln sampleResult@gov.bc.ca View' });

    fireEvent.click(await screen.findByRole('button', { name: 'View' }));
    expect(await screen.findByTitle('Additional User Info')).toBeVisible();
  });

  it('Should be able to click the Search in IDIM button, and corresponding modal showing up', async () => {
    render(
      <UserRoles
        selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir', 'bceidbasic'] }}
      />,
    );
    const searchUserInput = screen.getByRole('textbox');
    fireEvent.change(searchUserInput, { target: { value: 'sample_user' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    fireEvent.click(screen.getByRole('button', { name: 'Search in IDIM Web Service Lookup' }));
    await waitFor(() => {
      expect(screen.getByTitle('IDIM Web Service Lookup')).toBeInTheDocument();
    });

    await waitFor(() => {
      screen.getByRole('row', { name: 'First name Last Name Email IDIR username' });
    });
    const idimSearchInput = screen.getAllByPlaceholderText('Enter search criteria');
    fireEvent.change(idimSearchInput[1], { target: { value: 'sample' } });
    const idimSearchButton = screen.getAllByRole('button', { name: 'Search' });
    fireEvent.click(idimSearchButton[1]);
    await waitFor(() => {
      expect(searchIdirUsers).toHaveBeenCalled();
    });
  });
});
