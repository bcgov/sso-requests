import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import get from 'lodash.get';
import startCase from 'lodash.startcase';
import throttle from 'lodash.throttle';
import reduce from 'lodash.reduce';
import Button from '@button-inc/bcgov-theme/Button';
import { faExclamationCircle, faEye } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { Header, InfoText, LastSavedMessage } from '@bcgov-sso/common-react-components';
import Table from 'components/TableNew';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import UserDetailModal from 'page-partials/my-dashboard/UserDetailModal';
import IdimLookup from 'page-partials/my-dashboard/users-roles/IdimLookup';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRoles } from 'services/keycloak';
import InfoOverlay from 'components/InfoOverlay';
import { idpMap } from 'helpers/meta';
import { KeycloakUser } from 'interfaces/team';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

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

type IDPS = 'idir' | 'azureidir' | 'bceidbasic' | 'bceidbusiness' | 'bceidboth' | 'githubpublic' | 'githubbcgov';

const PAGE_LIMIT = 15;

const sliceRows = (page: number, rows: KeycloakUser[]) => rows.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

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
  const idimSearchModalRef = useRef<ModalRef>(emptyRef);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState<number>(1);
  const [count, setCount] = useState<number>(0);
  const [limit, setLimit] = useState<number>(PAGE_LIMIT);
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [rows, setRows] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  //@ts-ignore
  const [selectedIdp, setSelectedIdp] = useState<string>(selectedRequest.devIdps[0]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const throttleUpdate = useCallback(
    throttle(
      async (roleNames: string[]) => {
        await setSaving(true);
        const [, err] = await manageUserRoles({
          environment: selectedEnvironment,
          integrationId: selectedRequest.id as number,
          username: selectedId as string,
          roleNames,
        });
        if (!err) setSavingMessage(`Last saved at ${new Date().toLocaleString()}`);
        await setSaving(false);
      },
      2000,
      { trailing: true },
    ),
    [selectedRequest?.id, selectedEnvironment, selectedId],
  );

  const getRoles = async () => {
    if (!selectedRequest) return;

    await setLoading(true);

    const [data, err] = await listClientRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      first: 0,
      max: 1000,
    });

    const roles = data || [];

    setRoles(roles);
    setLoading(false);
  };

  const reset = () => {
    setRows([]);
    setUserRoles([]);
    setPage(1);
    setCount(0);
    setSelectedId(undefined);
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
    await setLoadingRight(true);
    const [data, err] = await listUserRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username,
    });

    await setUserRoles(data || []);
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
    if (selectedRequest.devIdps) setSelectedIdp(selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '');
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
    if (selectedId) fetchUserRoles(selectedId);
  }, [selectedId]);

  const searchResults = async (searchKey: string, property = selectedProperty, _page = page) => {
    if (searchKey.length < 2) return;

    setLoading(true);
    setSearchKey(searchKey);
    setPage(_page);
    setSelectedProperty(property);
    setRows([]);
    setUserRoles([]);
    setSelectedId(undefined);
    setSearched(true);

    const [data, err] = await searchKeycloakUsers({
      environment: selectedEnvironment,
      idp: selectedIdp,
      property,
      searchKey,
      integrationId: selectedRequest.id || -1,
    });

    if (data) {
      setRows(sliceRows(_page, data.rows));
      setCount(data.count);
    }
    setLoading(false);
  };

  const handleSearch = (key: string) => searchResults(key, undefined, 1);

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
    } else {
      newRoles = [...userRoles, actionMeta.option?.value as string];
    }

    throttleUpdate(newRoles);
    setUserRoles(newRoles);
  };

  let rightPanel = null;

  if (loadingRight) {
    rightPanel = <Loading />;
  } else if (selectedId) {
    rightPanel = (
      <>
        <Label>2. Assign User to a Role</Label>
        <Select
          value={userRoles.map((role) => ({ value: role, label: role }))}
          options={roles.map((role) => ({ value: role, label: role }))}
          isMulti={true}
          placeholder="Select..."
          noOptionsMessage={() => 'No roles'}
          onChange={handleRoleChange}
        />
        <LastSavedMessage saving={saving} content={savingMessage} />
      </>
    );
  }

  const showIdirLookupOption = selectedIdp === 'idir';
  const propertyOptions = propertyOptionMap[selectedIdp] || [];
  const headers = propertyOptions.length > 0 ? propertyOptions.filter((option) => option.result) : [];

  let idirLookup = null;

  if (searched && showIdirLookupOption) {
    idirLookup = (
      <>
        {rows.length > 0 && (
          <InfoText italic={true}>
            If you did not find the user you were looking for, you can try searching for the user in our IDIM Web
            Service Lookup tool. This tool uses a webservice to find IDIR users. so you will need to import the user
            that is found.
          </InfoText>
        )}
        <Button
          type="button"
          size="small"
          onClick={() =>
            idimSearchModalRef.current.open({
              key: new Date().getTime().toString(),
              idp: 'idir',
              property: selectedProperty,
              search: searchKey,
            })
          }
        >
          Search in IDIM Web Service Lookup
        </Button>
      </>
    );
  }

  const environments = selectedRequest?.environments || [];
  const idps = (selectedRequest?.devIdps || []) as IDPS[];
  const searchTooltip =
    selectedProperty === 'guid' || selectedIdp.startsWith('bceid')
      ? 'Exact text match results will be displayed'
      : 'Partial text match results will be displayed';

  const getTableStatusText = () => {
    if (searched) {
      return (
        <FlexBox>
          <FlexItem>
            <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
          </FlexItem>
          {showIdirLookupOption ? (
            <FlexItem>
              The user you searched for does not exist. Please try again, by entering the full search criteria or try
              using our IDIM Web Service Lookup tool.
            </FlexItem>
          ) : (
            <FlexItem>
              The user you searched for does not exist. Please try again, by entering the full search criteria.
            </FlexItem>
          )}
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

  const activateRow = (request: any) => {
    setSelectedId(request['original']['username']);
  };

  return (
    <>
      <TopMargin />
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={6}>
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

            <Table
              searchPlaceholder="Enter search criteria"
              variant="mini"
              rowSelectorKey={'username'}
              headers={[
                {
                  accessor: 'firstName',
                  Header: getTableHeaderLabel('firstName') || '',
                },
                {
                  accessor: 'lastName',
                  Header: getTableHeaderLabel('lastName') || '',
                },
                {
                  accessor: 'email',
                  Header: 'Email',
                },
                {
                  accessor: 'actions',
                  Header: '',
                  disableSortBy: true,
                },
              ]}
              data={rows.map((row) => {
                return {
                  username: get(row, 'username'),
                  firstName: get(row, 'firstName'),
                  lastName: get(row, 'lastName'),
                  email: get(row, 'email'),
                  actions: (
                    <ActionButtonContainer>
                      <ActionButton
                        icon={faEye}
                        role="button"
                        aria-label="view"
                        onClick={(event: any) => {
                          event.stopPropagation();

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
                };
              })}
              colfilters={[
                {
                  key: 'user-role-filter-env',
                  value: selectedEnvironment,
                  multiselect: false,
                  onChange: setSelectedEnvironment,
                  options: environments.map((env) => ({ value: env, label: startCase(env) })),
                },
                {
                  key: 'user-role-filter-idp',
                  value: selectedIdp,
                  multiselect: false,
                  onChange: setSelectedIdp,
                  options: idps.map((idp) => ({ value: idp, label: idpMap[idp] })),
                },
                {
                  key: 'user-role-filter-prop',
                  value: selectedProperty,
                  multiselect: false,
                  onChange: setSelectedProperty,
                  options: propertyOptions.filter((option) => option.search),
                },
              ]}
              showFilters={true}
              loading={loading}
              totalColSpan={20}
              searchColSpan={10}
              headerAlign={'bottom'}
              headerGutter={[5, 0]}
              searchKey={searchKey}
              searchLocation={'right'}
              onSearch={handleSearch}
              onEnter={handleSearch}
              noDataFoundElement={getTableStatusText()}
              pagination={true}
              pageLimits={[PAGE_LIMIT]}
              onPage={setPage}
              rowCount={count}
              limit={limit}
              onLimit={(val) => {
                setLimit(val);
              }}
              activateRow={activateRow}
              searchTooltip={searchTooltip}
            ></Table>
            {idirLookup}
          </Grid.Col>
          <Grid.Col span={4}>{rightPanel}</Grid.Col>
        </Grid.Row>
      </Grid>
      <UserDetailModal modalRef={infoModalRef} />
      <GenericModal
        ref={idimSearchModalRef}
        id="idim-webservice-lookup"
        title="IDIM Web Service Lookup"
        icon={null}
        onClose={(contentRef, context, closeContext) => {
          searchResults(closeContext.guid, 'guid', 1);
        }}
        cancelButtonText="Close"
        cancelButtonVariant="primary"
        showConfirmButton={false}
        buttonAlign="right"
        style={{ minWidth: '800px', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {(context: { key: string; idp: string; property: string; search: string }) => {
          if (!context) return <></>;

          return (
            <IdimLookup
              key={context.key}
              idp={context.idp}
              property={context.property}
              search={context.search}
              infoModalRef={infoModalRef}
              parentModalRef={idimSearchModalRef}
            />
          );
        }}
      </GenericModal>
    </>
  );
};

export default withTopAlert(UserRoles);
