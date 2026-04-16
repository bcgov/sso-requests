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
  listClientRoles: jest.fn(() => Promise.resolve([[{ name: 'role1' }], null])),
  listComposites: jest.fn(() => Promise.resolve([[false], null])),
  listUserRoles: jest.fn(() => Promise.resolve([['role1'], null])),
}));

jest.mock('services/bceid-webservice', () => ({
  searchIdirUsers: jest.fn(() =>
    Promise.resolve([
      [
        {
          guid: '000000001',
          userId: 'userId',
          displayName: 'displayName',
          contact: { email: 'idim_email@gov.bc.ca', telephone: '' },
          individualIdentity: {
            name: { firstname: 'idir_fn', middleName: '', otherMiddleName: '', surname: 'idir_ln', initials: '' },
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
      ],
      null,
    ]),
  ),
}));

describe('assign user to roles tab', () => {
  it('Should display correct user selection criteria for different idps', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    //test on env dropdown
    const selectEnvWrapper = screen.getByTestId('search-user-filter-env');
    const envInput = selectEnvWrapper.firstChild;
    fireEvent.keyDown(envInput as HTMLElement, { keyCode: 40 });
    const envOption = await screen.findByText('Test');
    fireEvent.click(envOption);
    expect(selectEnvWrapper).toHaveTextContent('Test');

    //test on IDPs dropdown
    const selectIDPWrapper = screen.getByTestId('search-user-filter-idp');
    const idpInput = selectIDPWrapper.firstChild;
    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('IDIR');
    fireEvent.click(idpOption[0]);
    expect(selectIDPWrapper).toHaveTextContent('IDIR');
    expect(screen.getAllByText('First Name'));

    //test on property dropdown
    const selectPropertyWrapper = screen.getByTestId('search-user-filter-prop');
    const propInput = selectPropertyWrapper.firstChild;
    fireEvent.keyDown(propInput as HTMLElement, { keyCode: 40 });
    const propOption = await screen.findByText('IDP GUID');
    fireEvent.click(propOption);
    expect(selectPropertyWrapper).toHaveTextContent('IDP GUID');
  });

  it('Should display correct user selection criteria for BCeID idps', async () => {
    render(
      <UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['bceidbasic'] }} />,
    );
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const selectIDPWrapper = screen.getByTestId('search-user-filter-idp');
    const selectPropertyWrapper = screen.getByTestId('search-user-filter-prop');

    fireEvent.keyDown(selectIDPWrapper.firstChild as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('Basic BCeID');
    fireEvent.click(idpOption[1]);
    expect(selectIDPWrapper).toHaveTextContent('Basic BCeID');

    fireEvent.keyDown(selectPropertyWrapper.firstChild as HTMLElement, { keyCode: 40 });
    expect(screen.getAllByText('Display Name'));
    expect(screen.getAllByText('Username'));
    expect(screen.getAllByText('Email'));
    expect(screen.getByText('IDP GUID')).toBeInTheDocument();
  });

  it('Should display correct user selection criteria for Github idps', async () => {
    render(
      <UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['githubpublic'] }} />,
    );
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const selectIDPWrapper = screen.getByTestId('search-user-filter-idp');
    const selectPropertyWrapper = screen.getByTestId('search-user-filter-prop');
    const idpInput = selectIDPWrapper.firstChild;
    const propInput = selectPropertyWrapper.firstChild;

    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('GitHub');
    fireEvent.click(idpOption[1]);
    expect(selectIDPWrapper).toHaveTextContent('GitHub');

    fireEvent.keyDown(propInput as HTMLElement, { keyCode: 40 });
    expect(screen.getAllByText('Name'));
    expect(screen.getAllByText('Login'));
    expect(screen.getAllByText('Email'));
    expect(screen.getByText('IDP GUID')).toBeInTheDocument();
  });

  it('Should be able to list search results, after click on the Search button; Should be able to click the View button for listed search result, and corresponding modal showing up', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['azureidir', 'bceidbasic', 'githubpublic'],
        }}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });
    const searchUserInput = screen.getByPlaceholderText('Enter search criteria');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    });

    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
      expect(screen.getByText('sampleResult@gov.bc.ca')).toBeInTheDocument();
    });

    screen.findByRole('row', { name: 'fn ln sampleResult@gov.bc.ca View' });

    fireEvent.click(await screen.findByRole('button', { name: 'view' }));
    expect(await screen.findByTitle('Additional User Info')).toBeVisible();
  });
});
