import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { searchKeycloakUsers } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';
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
    const selectEnvWrapper = screen.getByTestId('filter-env');
    const envInput = selectEnvWrapper.lastChild;
    fireEvent.keyDown(envInput as HTMLElement, { keyCode: 40 });
    const envOption = await screen.findByText('Test');
    fireEvent.click(envOption);
    expect(selectEnvWrapper).toHaveTextContent('Test');

    //test on IDPs dropdown
    const selectIDPWrapper = screen.getByTestId('filter-idp');
    const idpInput = selectIDPWrapper.lastChild;
    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('IDIR');
    fireEvent.click(idpOption[0]);
    expect(selectIDPWrapper).toHaveTextContent('IDIR');
    expect(screen.getByText('First Name'));

    //test on property dropdown
    const selectPropertyWrapper = screen.getByTestId('filter-prop');
    const propInput = selectPropertyWrapper.lastChild;
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

    const selectIDPWrapper = screen.getByTestId('filter-idp');
    const selectPropertyWrapper = screen.getByTestId('filter-prop');
    const idpInput = selectIDPWrapper.lastChild;
    const propInput = selectPropertyWrapper.lastChild;

    fireEvent.keyDown(idpInput as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('Basic BCeID');
    fireEvent.click(idpOption[1]);
    expect(selectIDPWrapper).toHaveTextContent('Basic BCeID');

    fireEvent.keyDown(propInput as HTMLElement, { keyCode: 40 });
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

    const selectIDPWrapper = screen.getByTestId('filter-idp');
    const selectPropertyWrapper = screen.getByTestId('filter-prop');
    const idpInput = selectIDPWrapper.lastChild;
    const propInput = selectPropertyWrapper.lastChild;

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
          devIdps: ['idir', 'bceidbasic', 'githubpublic'],
        }}
      />,
    );
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
    const idimSearchInput = screen.getAllByRole('textbox');
    fireEvent.change(idimSearchInput[1], { target: { value: 'idim_sample_input' } });

    //test on property dropdown
    const selectPropertyWrapper = screen.getByTestId('idim-filter-prop');
    const propInput = selectPropertyWrapper.lastChild;
    fireEvent.keyDown(propInput as HTMLElement, { keyCode: 40 });
    const propOption = await screen.findByText('Username');
    fireEvent.click(propOption);
    expect(selectPropertyWrapper).toHaveTextContent('Username');

    const idimSearchButton = screen.getAllByRole('button', { name: 'Search' });
    fireEvent.click(idimSearchButton[1]);
    await waitFor(() => {
      expect(searchIdirUsers).toHaveBeenCalled();
    });
  });
});
