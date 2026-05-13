import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserRoles from 'page-partials/my-dashboard/UserRoles';
import { listUserRoles, manageUserRoles, searchKeycloakUsers } from 'services/keycloak';
import { sampleRequest } from '../../samples/integrations';
import { importAzureIdirUser, searchAzureIdirUsers } from '@app/services/ms-graph';
import { importIdirUser, searchIdirUsers } from '@app/services/bceid-webservice';
import * as servicesKeycloak from 'services/keycloak';
import * as bceidWebservice from 'services/bceid-webservice';
import * as graphWebservice from 'services/ms-graph';

jest.mock('services/keycloak', () => ({
  ...jest.requireActual('services/keycloak'),
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
  listClientRoles: jest.fn(() => Promise.resolve([[{ name: 'role1' }, { name: 'role2' }, { name: 'role3' }], null])),
  listComposites: jest.fn(() => Promise.resolve([[false], null])),
  listUserRoles: jest.fn(() => Promise.resolve([['role1'], null])),
  manageUserRoles: jest.fn(() => Promise.resolve([true, null])),
}));

jest.mock('services/bceid-webservice', () => ({
  searchIdirUsers: jest.fn(() =>
    Promise.resolve([
      [
        {
          guid: '000000002',
          userId: 'userId',
          displayName: 'displayName',
          email: 'idim_email@gov.bc.ca',
          firstName: 'idir_fn',
          lastName: 'idir_ln',
        },
      ],
      null,
    ]),
  ),
  importIdirUser: jest.fn(() => Promise.resolve([true, null])),
}));

jest.mock('services/ms-graph', () => ({
  searchAzureIdirUsers: jest.fn(() =>
    Promise.resolve([
      [
        {
          guid: '000000003',
          userId: 'userId',
          displayName: 'displayName',
          firstName: 'azureidir_fn',
          lastName: 'azureidir_ln',
          company: '',
          phone: '',
          department: '',
          jobTitle: '',
          email: 'azureidir.user@gov.bc.ca',
        },
      ],
      null,
    ]),
  ),
  importAzureIdirUser: jest.fn(() => Promise.resolve()),
}));

describe('assign user to roles tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
    const propOption = await screen.findByText('Username');
    fireEvent.click(propOption);
  });

  it('Should display correct user selection criteria for IDIR idps', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['idir'] }} />);
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const selectIDPWrapper = screen.getByTestId('search-user-filter-idp');
    const selectPropertyWrapper = screen.getByTestId('search-user-filter-prop');

    fireEvent.keyDown(selectIDPWrapper.firstChild as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('IDIR');
    fireEvent.click(idpOption[0]);
    expect(selectIDPWrapper).toHaveTextContent('IDIR');

    fireEvent.keyDown(selectPropertyWrapper.firstChild as HTMLElement, { keyCode: 40 });
    expect(screen.getAllByText('First Name'));
    expect(screen.getAllByText('Last Name'));
    expect(screen.getAllByText('Email'));
    expect(screen.getByText('Username')).toBeInTheDocument();
  });

  it('Should display correct user selection criteria for IDIR - MFA idps', async () => {
    render(<UserRoles selectedRequest={{ ...sampleRequest, environments: ['dev', 'test'], devIdps: ['azureidir'] }} />);
    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const selectIDPWrapper = screen.getByTestId('search-user-filter-idp');
    const selectPropertyWrapper = screen.getByTestId('search-user-filter-prop');

    fireEvent.keyDown(selectIDPWrapper.firstChild as HTMLElement, { keyCode: 40 });
    const idpOption = await screen.findAllByText('IDIR - MFA');
    fireEvent.click(idpOption[0]);
    expect(selectIDPWrapper).toHaveTextContent('IDIR - MFA');

    fireEvent.keyDown(selectPropertyWrapper.firstChild as HTMLElement, { keyCode: 40 });
    expect(screen.getAllByText('First Name'));
    expect(screen.getAllByText('Last Name'));
    expect(screen.getAllByText('Email'));
    expect(screen.getByText('Username')).toBeInTheDocument();
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
      expect(searchAzureIdirUsers).toHaveBeenCalled();
      expect(screen.getByText('sampleResult@gov.bc.ca')).toBeInTheDocument();
      expect(screen.getByText('azureidir.user@gov.bc.ca')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('row')[1]).toHaveTextContent('fnlnsampleResult@gov.bc.ca');

    expect(screen.getAllByRole('row')[2]).toHaveTextContent('azureidir_fnazureidir_lnazureidir.user@gov.bc.ca');

    fireEvent.click((await screen.findAllByRole('button', { name: 'view' }))[0]);
    expect(await screen.findByTitle('Additional User Info')).toBeVisible();
  });

  it('Should be able to show merged list of idir users from keycloak and idim web service and lets importing user upon role assignment', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['idir'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const searchUserInput = screen.getByPlaceholderText('Enter search criteria');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    jest.spyOn(servicesKeycloak, 'listUserRoles').mockResolvedValue([[], null]);

    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
      expect(searchIdirUsers).toHaveBeenCalled();
      expect(listUserRoles).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('idim_email@gov.bc.ca'));

    const assignRolesSelectWrapper = screen.getByTestId('user-role-select');

    fireEvent.keyDown(assignRolesSelectWrapper.childNodes[1], { keyCode: 40 });

    fireEvent.click(screen.getByText('role1'));

    await waitFor(() => {
      expect(importIdirUser).toHaveBeenCalled();
      expect(manageUserRoles).toHaveBeenCalled();
    });

    expect(screen.getByText(/Last saved at/i)).toBeInTheDocument();
  });

  it('Should be able to show merged list of azureidir users from keycloak and idim web service and lets importing user upon role assignment', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['azureidir'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const searchUserInput = screen.getByPlaceholderText('Enter search criteria');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    jest.spyOn(servicesKeycloak, 'listUserRoles').mockResolvedValue([[], null]);

    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
      expect(searchAzureIdirUsers).toHaveBeenCalled();
      expect(listUserRoles).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('azureidir.user@gov.bc.ca'));

    const assignRolesSelectWrapper = screen.getByTestId('user-role-select');

    fireEvent.keyDown(assignRolesSelectWrapper.childNodes[1], { keyCode: 40 });

    fireEvent.click(screen.getByText('role1'));

    await waitFor(() => {
      expect(importAzureIdirUser).toHaveBeenCalled();
      expect(manageUserRoles).toHaveBeenCalled();
    });

    expect(screen.getByText(/Last saved at/i)).toBeInTheDocument();
  });

  it('Should show error when importing idir user fails', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['idir'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const searchUserInput = screen.getByPlaceholderText('Enter search criteria');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    jest.spyOn(servicesKeycloak, 'listUserRoles').mockResolvedValue([[], null]);

    jest.spyOn(bceidWebservice, 'importIdirUser').mockImplementation(() => {
      throw new Error('import user failed');
    });

    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
      expect(searchIdirUsers).toHaveBeenCalled();
      expect(listUserRoles).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('idim_email@gov.bc.ca'));

    const assignRolesSelectWrapper = screen.getByTestId('user-role-select');

    fireEvent.keyDown(assignRolesSelectWrapper.childNodes[1], { keyCode: 40 });

    fireEvent.click(screen.getByText('role1'));

    await waitFor(() => {
      expect(importIdirUser).toHaveBeenCalled();
      expect(manageUserRoles).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/Failed to import user to Keycloak/i)).toBeInTheDocument();
  });

  it('Should show error when importing azure idir user fails', async () => {
    render(
      <UserRoles
        selectedRequest={{
          ...sampleRequest,
          environments: ['dev', 'test'],
          devIdps: ['azureidir'],
        }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('1. Search for a user based on the selection criteria below')).toBeInTheDocument();
    });

    const searchUserInput = screen.getByPlaceholderText('Enter search criteria');
    fireEvent.change(searchUserInput, { target: { value: 'sample' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    jest.spyOn(servicesKeycloak, 'listUserRoles').mockResolvedValue([[], null]);

    jest.spyOn(graphWebservice, 'importAzureIdirUser').mockImplementation(() => {
      throw new Error('import user failed');
    });

    await waitFor(() => {
      expect(searchKeycloakUsers).toHaveBeenCalled();
      expect(searchAzureIdirUsers).toHaveBeenCalled();
      expect(listUserRoles).toHaveBeenCalled();
    });

    fireEvent.click(screen.getByText('azureidir.user@gov.bc.ca'));

    const assignRolesSelectWrapper = screen.getByTestId('user-role-select');

    fireEvent.keyDown(assignRolesSelectWrapper.childNodes[1], { keyCode: 40 });

    fireEvent.click(screen.getByText('role1'));

    await waitFor(() => {
      expect(importAzureIdirUser).toHaveBeenCalled();
      expect(manageUserRoles).not.toHaveBeenCalled();
    });

    expect(screen.getByText(/Failed to import user to Keycloak/i)).toBeInTheDocument();
  });
});
