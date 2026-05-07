import React, { useEffect, useState, useRef, useCallback, useContext } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { get, startCase, throttle, reduce } from 'lodash';
import { faExclamationCircle, faEye } from '@fortawesome/free-solid-svg-icons';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { Header, InfoText, LastSavedMessage, SearchBar } from '@bcgov-sso/common-react-components';
import { ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import UserDetailModal from 'page-partials/my-dashboard/UserDetailModal';
import IdimLookup from 'page-partials/my-dashboard/users-roles/IdimLookup';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRoles } from 'services/keycloak';
import InfoOverlay from 'components/InfoOverlay';
import { idpMap } from 'helpers/meta';
import { KeycloakUser } from 'interfaces/team';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { SurveyContext } from '@app/utils/context';
import TableNew from '@app/components/TableNew';
import { Col, Row } from 'react-bootstrap';
import ActionButton from '@app/components/ActionButton';
import { searchIdirUsers, importIdirUser } from 'services/bceid-webservice';
import { importAzureIdirUser, searchAzureIdirUsers } from '@app/services/ms-graph';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const AlignCenter = styled.div`
  text-align: center;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const FlexBox = styled.div`
  display: flex;
  & > * {
    padding-right: 0.5rem;
  }
`;

const FlexItem = styled.div`
  padding-top: 10px;
  padding-bottom: 10px;
`;

const CenterAlign = styled.div`
  text-align: center;
`;

const Loading = () => (
  <AlignCenter>
    <TopMargin />
    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
  </AlignCenter>
);

type IDPS =
  | 'idir'
  | 'azureidir'
  | 'bceidbasic'
  | 'bceidbusiness'
  | 'bceidboth'
  | 'githubpublic'
  | 'githubbcgov'
  | 'digitalcredential'
  | 'social';

interface PropertyOption {
  value: string;
  label: string;
  search: boolean;
  result: boolean;
  style?: any;
}

const idirPropertyOptions: PropertyOption[] = [
  { value: 'firstName', label: 'First Name', search: true, result: true },
  {
    value: 'lastName',
    label: 'Last Name',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'email',
    label: 'Email',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'guid',
    label: 'IDP GUID',
    search: true,
    result: false,
  },
];

const bceidPropertyOptions: PropertyOption[] = [
  {
    value: 'firstName',
    label: 'Display Name',
    search: true,
    result: true,
  },
  {
    value: 'lastName',
    label: 'Username',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'email',
    label: 'Email',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'guid',
    label: 'IDP GUID',
    search: true,
    result: false,
  },
];

const githubPropertyOptions: PropertyOption[] = [
  {
    value: 'firstName',
    label: 'Name',
    search: true,
    result: true,
  },
  {
    value: 'lastName',
    label: 'Login',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'email',
    label: 'Email',
    search: true,
    result: true,
    style: { minWidth: '170px' },
  },
  {
    value: 'guid',
    label: 'IDP GUID',
    search: true,
    result: false,
  },
];

const propertyOptionMap: { [key: string]: PropertyOption[] } = {
  idir: idirPropertyOptions,
  azureidir: idirPropertyOptions,
  bceidbasic: bceidPropertyOptions,
  bceidbusiness: bceidPropertyOptions,
  bceidboth: bceidPropertyOptions,
  githubpublic: githubPropertyOptions,
  githubbcgov: githubPropertyOptions,
};

interface Props {
  selectedRequest: Integration;
  alert: TopAlert;
}

const UserRoles = ({ selectedRequest, alert }: Props) => {
  const infoModalRef = useRef<ModalRef>(emptyRef);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [count, setCount] = useState<number>(0);
  const [limit, setLimit] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [rows, setRows] = useState<(KeycloakUser & { source: string })[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [compositeResult, setCompositeResult] = useState<boolean[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  //@ts-ignore
  const [selectedIdp, setSelectedIdp] = useState<string>(selectedRequest.devIdps[0]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<(KeycloakUser & { source: string }) | undefined>(undefined);
  const [userAssignmentError, setUserAssignmentError] = useState(false);
  const surveyContext = useContext(SurveyContext);

  const sliceRows = (page: number, rows: any[]) => rows.slice((page - 1) * limit, page * limit);

  const throttleUpdate = useCallback(
    throttle(
      async (roleNames: string[]) => {
        setSaving(true);

        if (selectedUser?.source === 'idp') {
          if (selectedUser.username.split('@')[1].startsWith('idir')) {
            await handleIdirImport({
              guid: selectedUser.username.split('@')[0],
              firstName: selectedUser.firstName,
              lastName: selectedUser.lastName,
              email: selectedUser.email,
              displayName: selectedUser.attributes['displayName'] || '',
              idirUsername: selectedUser.attributes['idir_username'] || '',
            });
          } else if (selectedUser.username.split('@')[1].startsWith('azureidir')) {
            await handleAzureImport({
              guid: selectedUser.username.split('@')[0].toUpperCase(),
              userId: selectedUser.attributes['idir_username'] || '',
            });
          }
        }

        setSavingMessage('Assigning role...');
        setUserAssignmentError(false);
        const [, err] = await manageUserRoles({
          environment: selectedEnvironment,
          integrationId: selectedRequest.id as number,
          username: selectedUser?.username as string,
          roleNames,
        });
        setSaving(false);
        if (!err) {
          setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
          surveyContext?.setShowSurvey(true, 'addUserToRole');
          return true;
        } else {
          setUserAssignmentError(true);
          setSavingMessage('Failed to update roles.');
          return false;
        }
      },
      2000,
      { trailing: true },
    ),
    [selectedRequest?.id, selectedEnvironment, selectedUser?.username, surveyContext],
  );

  const getRoles = async () => {
    if (!selectedRequest) return;

    setLoading(true);

    const [data, err] = await listClientRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      first: 0,
      max: 1000,
    });

    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to fetch roles.',
      });
    }

    const roles = data === null ? [] : data.map((role: any) => role.name);

    setRoles(roles);
    setCompositeResult(data === null ? [] : data.map((role: any) => role.composite));
    setLoading(false);
  };

  const reset = () => {
    setRows([]);
    setUserRoles([]);
    setPage(1);
    setCount(0);
    setSelectedUser(undefined);
    setSearched(false);
  };

  const resetSearchOptions = () => {
    setSearchKey('');
    setSelectedEnvironment('dev');
    if (selectedRequest.devIdps) {
      const idp = selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '';
      setSelectedIdp(idp);
      const propertyOptions = propertyOptionMap[idp] || [];
      if (propertyOptions.length > 0) setSelectedProperty(propertyOptions[0].value);
    }
  };

  const fetchUserRoles = async (username: string) => {
    setLoadingRight(true);
    const [data, err] = await listUserRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username,
    });

    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to fetch user roles.',
      });
      setLoadingRight(false);
      return;
    }

    setUserRoles(data || []);
    setLoadingRight(false);
  };

  useEffect(() => {
    reset();
    resetSearchOptions();
    setRoles([]);
  }, [selectedRequest.id]);

  useEffect(() => {
    searchResults(searchKey, undefined, page);
  }, [page]);

  useEffect(() => {
    searchResults(searchKey, undefined, 1);
  }, [limit]);

  useEffect(() => {
    reset();
    getRoles();
  }, [selectedEnvironment]);

  useEffect(() => {
    reset();

    const propertyOptions = propertyOptionMap[selectedIdp] || [];
    const isCurrentPropertyAllowed = propertyOptions.find(
      (option) => option.search && option.value === selectedProperty,
    );

    if (!isCurrentPropertyAllowed) {
      if (propertyOptions.length > 0) setSelectedProperty(propertyOptions[0].value);
    }
  }, [selectedIdp]);

  useEffect(() => {
    setSavingMessage('');
    if (selectedUser) {
      try {
        fetchUserRoles(selectedUser.username);
      } catch (err) {
        setUserRoles([]);
      }
    }
  }, [selectedUser?.username]);

  const searchResults = async (searchKey: string, property = selectedProperty, _page = page) => {
    if (searchKey.length < 2) return;

    setLoading(true);
    setSearchKey(searchKey);
    setPage(_page);
    setSelectedProperty(property);
    setRows([]);
    setUserRoles([]);
    setSelectedUser(undefined);

    const users = [];

    const [data, err] = await searchKeycloakUsers({
      environment: selectedEnvironment,
      idp: selectedIdp,
      property,
      searchKey,
      integrationId: selectedRequest.id || -1,
    });

    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to fetch users.',
      });
    }

    users.push(...(data?.rows.map((u) => ({ ...u, source: 'keycloak' })) || []));

    if (users.length > 0 && ['idir', 'azureidir'].includes(selectedIdp)) {
      const userGuids = new Set(users.map((u) => u.username.split('@')[0].toLowerCase()));
      const idpUsers = [];

      if (selectedIdp == 'idir') {
        const [data, err] = await searchIdirUsers({
          field: property,
          search: searchKey,
        });
        if (err) {
          alert.show({
            variant: 'danger',
            content: 'Failed to fetch users.',
          });
        }
        idpUsers.push(...(data || []));
      } else if (selectedIdp == 'azureidir') {
        switch (property) {
          case 'firstName':
            property = 'givenName';
            break;
          case 'lastName':
            property = 'surname';
            break;
          case 'email':
            property = 'mail';
            break;
          default:
            break;
        }
        const [data, err] = await searchAzureIdirUsers({
          field: property,
          search: searchKey,
        });
        if (err) {
          alert.show({
            variant: 'danger',
            content: 'Failed to fetch users.',
          });
        }
        idpUsers.push(...(data || []));
      }

      const filteredIdpUsers = idpUsers?.filter((u) => !userGuids.has(u.guid.toLowerCase())) || [];

      users.push(
        ...(filteredIdpUsers.map((u) => ({
          source: 'idp',
          username: `${u.guid.toLowerCase()}@${selectedIdp}`,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          attributes: {
            idir_user_id: u.guid,
            idir_username: u.userId,
            displayName: u.displayName,
          },
        })) || []),
      );
    }

    if (users.length > 0) {
      setRows(sliceRows(_page, users));
    }

    setSearched(true);
    setCount(users.length);
    setLoading(false);
  };

  const handleSearch = (key: string) => searchResults(key, undefined, 1);

  const handleIdirImport = async (data: any) => {
    const [_, err] = await importIdirUser(data);
    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to import user.',
      });
    }
  };

  const handleAzureImport = async (data: any) => {
    const [_, err] = await importAzureIdirUser(data);
    if (err) {
      alert.show({
        variant: 'danger',
        content: 'Failed to import user.',
      });
    }
  };

  const handleRoleChange = async (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    let newRoles: string[] = [];
    if (actionMeta.action === 'clear') {
    } else if (actionMeta.action === 'remove-value') {
      newRoles = userRoles.filter((role) => role !== (actionMeta.removedValue?.value as string));
    } else if (actionMeta.action === 'pop-value') {
      newRoles = [...userRoles.slice(0, -1)];
    } else {
      newRoles = [...userRoles, actionMeta.option?.value as string];
    }

    // Only send update if roles have been added or removed. Prevents excessive API calls if jamming backspace button when empty.
    if (newRoles.length !== userRoles.length) {
      const succeeded = await throttleUpdate(newRoles);
      if (succeeded) {
        setUserRoles(newRoles);
      }
    }
  };

  const updateRoleName = (role: string, index: number) => {
    if (compositeResult[index] == true) return `${role} (Composite role)`;
    else return role;
  };

  let rightPanel = null;

  if (loadingRight) {
    rightPanel = <Loading />;
  } else if (selectedUser) {
    rightPanel = (
      <>
        <Label>2. Assign User to a Role</Label>
        <Select
          value={userRoles.map((role) => ({ value: role, label: role }))}
          options={roles.map((role, index) => ({ value: role, label: updateRoleName(role, index) }))}
          isMulti={true}
          placeholder="Select..."
          noOptionsMessage={() => 'No roles'}
          onChange={handleRoleChange}
          data-testid="user-role-select"
        />
        <LastSavedMessage saving={saving} content={savingMessage} variant={userAssignmentError ? 'error' : 'success'} />
      </>
    );
  }

  const propertyOptions = propertyOptionMap[selectedIdp] || [];
  const headers = propertyOptions.length > 0 ? propertyOptions.filter((option) => option.result) : [];

  const environments = selectedRequest?.environments || [];
  const idps = (selectedRequest?.devIdps || []) as IDPS[];
  const searchTooltip =
    selectedProperty === 'guid' || selectedIdp?.startsWith('bceid')
      ? 'Exact text match results will be displayed'
      : 'Partial text match results will be displayed';

  const getTableStatusText = () => {
    if (searched) {
      return (
        <FlexBox>
          <FlexItem>
            <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
          </FlexItem>
          <FlexItem>
            The user you searched for does not exist. Please try again, by entering the full search criteria.
          </FlexItem>
        </FlexBox>
      );
    } else {
      return <CenterAlign>You have not searched for any users yet.</CenterAlign>;
    }
  };

  const getTableHeaderLabel = (key: string) => {
    const propOption = propertyOptions.find((p) => p.value === key);
    return propOption?.label.toString();
  };

  const activateRow = (row: any) => {
    setSelectedUser(row);
  };

  return (
    <>
      <TopMargin />
      <Row>
        <Col lg={6}>
          <Header variant="dark" size="sm">
            1. Search for a user based on the selection criteria below &nbsp;
            <InfoOverlay
              title={''}
              content={
                'When searching BCeID GUID, please ensure your end users has logged in via your app (and indirectly our IDP) for this search to be successful.'
              }
              hide={200}
            />
          </Header>
          <div data-testid="role-search-table">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[
                {
                  key: 'search-user-filter-env',
                  value: selectedEnvironment,
                  multiselect: false,
                  onChange: setSelectedEnvironment,
                  options: environments.map((env) => ({ value: env, label: startCase(env) })),
                },
                {
                  key: 'search-user-filter-idp',
                  value: selectedIdp,
                  multiselect: false,
                  onChange: setSelectedIdp,
                  options: idps
                    // Don't allow role assignment to DC, OTP, or BCSC users
                    .filter((idp) => !['digitalcredential', 'bcservicescard', 'social', 'otp'].includes(idp))
                    .map((idp) => ({ value: idp, label: idpMap[idp] })),
                },
                {
                  key: 'search-user-filter-prop',
                  value: selectedProperty,
                  multiselect: false,
                  onChange: setSelectedProperty,
                  options: propertyOptions.filter((option) => option.search),
                },
              ].map((filter) => {
                return (
                  <div style={{ flex: 1 }} data-testid={filter.key} key={filter.key}>
                    <Select
                      value={filter.options.find((option) => option.value === filter.value)}
                      options={filter.options}
                      isMulti={filter.multiselect}
                      placeholder="Select..."
                      onChange={(option: any) => filter.onChange(option ? (option as any).value : '')}
                      isSearchable={true}
                      defaultValue={filter.options[0]}
                    />
                  </div>
                );
              })}
              <SearchBar
                placeholder="Enter search criteria"
                tooltip={searchTooltip}
                onChange={(e: any) => setSearchKey(e.target.value)}
                onKeyDown={(e: any) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchKey);
                  }
                }}
              />
              <InfoOverlay content={searchTooltip || 'some text'}>
                <button
                  className="primary"
                  type="button"
                  onClick={() => handleSearch(searchKey)}
                  style={{ padding: '.44rem 1.5rem' }}
                >
                  Search
                </button>
              </InfoOverlay>
            </div>

            <TableNew
              dataTestId="user-roles-table"
              variant="mini"
              columns={[
                {
                  accessorKey: 'firstName',
                  header: getTableHeaderLabel('firstName') || '',
                },
                {
                  accessorKey: 'lastName',
                  header: getTableHeaderLabel('lastName') || '',
                },
                {
                  accessorKey: 'email',
                  header: getTableHeaderLabel('email') || '',
                },
                {
                  accessorKey: 'actions',
                  header: '',

                  cell: (props) => (
                    <ActionButtonContainer>
                      <ActionButton
                        icon={faEye}
                        role="button"
                        aria-label="view"
                        onClick={(event: any) => {
                          event.stopPropagation();
                          const row = props.row.original;
                          infoModalRef.current.open({
                            guid: row.username.split('@')[0],
                            attributes: {
                              ...reduce(
                                headers,
                                (ret: { [key: string]: string }, header) => {
                                  ret[header.label] = get(row, header.value);
                                  return ret;
                                },
                                {},
                              ),
                              ...row.attributes,
                            },
                          });
                        }}
                        title="View"
                        size="lg"
                      />
                    </ActionButtonContainer>
                  ),
                },
              ]}
              data={rows.map((row) => {
                return {
                  username: get(row, 'username'),
                  firstName: get(row, 'firstName'),
                  lastName: get(row, 'lastName'),
                  email: get(row, 'email'),
                  attributes: row.attributes,
                  source: row.source,
                };
              })}
              loading={loading}
              enableGlobalSearch={false}
              onRowSelect={activateRow}
              noDataFoundMessage={getTableStatusText()}
              totalRowCount={count}
              onPageSizeChange={setLimit}
              serverPageIndex={page}
              onPageChange={setPage}
            ></TableNew>
          </div>
        </Col>
        <Col>{rightPanel}</Col>
      </Row>
      <UserDetailModal modalRef={infoModalRef} />
    </>
  );
};

export default withTopAlert(UserRoles);
