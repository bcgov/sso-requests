import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { map, omitBy, startCase, isEmpty, throttle } from 'lodash';
import Button from '@button-inc/bcgov-theme/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faEye, faDownload, faLock } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import { Grid as SpinnerGrid } from 'react-loader-spinner';
import { Integration, ClientRole, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import { Header, InfoText, LastSavedMessage } from '@bcgov-sso/common-react-components';
import Table from 'components/Table';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import IdimLookup from 'page-partials/my-dashboard/users-roles/IdimLookup';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRoles, KeycloakUser } from 'services/keycloak';
import InfoOverlay from 'components/InfoOverlay';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const ReadonlyContainer = styled.div`
  display: flex;
  & > div:first-child {
    margin-right: 20px;
  }
`;

const Readonly = styled.div<{ width?: string }>`
  background-color: #f1f1f1;
  margin: 2px 0 2px 0;
  padding: 4px 6px;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlySubHeader = styled.div<{ width?: string }>`
  font-size: 0.9rem;
  ${(props) => (props.width ? `width: ${props.width};` : `width: 300px;`)}
`;

const ReadonlyItem = ({ children, width }: { children: React.ReactNode; width?: string }) => {
  return (
    <Readonly width={width}>
      <Grid cols={6}>
        <Grid.Row gutter={[]}>
          <Grid.Col span={5}>{children}</Grid.Col>
          <Grid.Col span={1} style={{ textAlign: 'right' }}>
            <FontAwesomeIcon icon={faLock} color="#9F9F9F" size="lg" />
          </Grid.Col>
        </Grid.Row>
      </Grid>
    </Readonly>
  );
};

const AlignCenter = styled.div`
  text-align: center;
`;

const TopMargin = styled.div`
  height: var(--field-top-spacing);
`;

const CenterAlign = styled.div`
  text-align: center;
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

const Loading = () => (
  <AlignCenter>
    <TopMargin />
    <SpinnerGrid color="#000" height={45} width={45} wrapperClass="d-block" visible={true} />
  </AlignCenter>
);

type IDPS = 'idir' | 'azureidir' | 'bceidbasic' | 'bceidbusiness' | 'bceidboth';

const PAGE_LIMIT = 15;

const sliceRows = (page: number, rows: KeycloakUser[]) => rows.slice((page - 1) * PAGE_LIMIT, page * PAGE_LIMIT);

const idpMap = {
  idir: 'IDIR',
  azureidir: 'Azure IDIR',
  bceidbasic: 'BCeID Basic',
  bceidbusiness: 'BCeID Business',
  bceidboth: 'BCeID Both',
};

const propertyOptions = [
  { value: 'lastName', label: 'Last Name', allowed: ['idir', 'azureidir'] },
  { value: 'firstName', label: 'First Name', allowed: ['idir', 'azureidir'] },
  { value: 'email', label: 'Email', allowed: ['idir', 'azureidir'] },
  { value: 'guid', label: 'IDP GUID', allowed: ['idir', 'azureidir', 'bceidbasic', 'bceidbusiness', 'bceidboth'] },
];

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
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingMessage, setSavingMessage] = useState('');
  const [rows, setRows] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  const [selectedIdp, setSelectedIdp] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const pageLimits = [{ value: PAGE_LIMIT, text: `${PAGE_LIMIT} per page` }];

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
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(idp));
      setSelectedProperty(firstAllowedProperty?.value || '');
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
    reset();
    getRoles();
    if (selectedRequest.devIdps) setSelectedIdp(selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '');
  }, [selectedEnvironment]);

  useEffect(() => {
    reset();
    const currentPropertyOption = propertyOptions.find((v) => v.value === selectedProperty);
    const isCurrentPropertyAllowed = currentPropertyOption?.allowed.includes(selectedIdp);
    if (!isCurrentPropertyAllowed) {
      const firstAllowedProperty = propertyOptions.find((v) => v.allowed.includes(selectedIdp));
      setSelectedProperty(firstAllowedProperty?.value || '');
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
    });

    if (data) {
      setRows(sliceRows(_page, data.rows));
      setCount(data.count);
      if (data.count === 1) {
        setSelectedId(data.rows[0].username);
      }
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
    let newRoles = [];
    if (actionMeta.action === 'remove-value') {
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

  let content = null;
  if (!searched) {
    content = (
      <tr>
        <td colSpan={10}>
          <CenterAlign>You have not searched for any users yet.</CenterAlign>
        </td>
      </tr>
    );
  } else if (rows.length > 0) {
    content = rows.map((row: KeycloakUser) => {
      return (
        <tr
          key={row.username}
          className={selectedId === row.username ? 'active' : ''}
          onClick={() => {
            setSelectedId(row.username);
          }}
        >
          <td>{row.firstName}</td>
          <td>{row.lastName}</td>
          <td>{row.email}</td>
          <td>
            <ActionButtonContainer>
              <ActionButton
                icon={faEye}
                role="button"
                aria-label="view"
                onClick={(event) => {
                  event.stopPropagation();

                  infoModalRef.current.open({
                    guid: row.username.split('@')[0],
                    attributes: {
                      firstName: row.firstName,
                      lastName: row.lastName,
                      email: row.email,
                      ...row.attributes,
                    },
                  });
                }}
                title="View"
                size="lg"
              />
            </ActionButtonContainer>
          </td>
        </tr>
      );
    });
  } else {
    content = (
      <tr>
        <td colSpan={10}>
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
        </td>
      </tr>
    );
  }

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
              key={searchKey}
              variant="mini"
              searchLocation="right"
              filters={[
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
                  options: propertyOptions.filter((v) => v.allowed.includes(selectedIdp)),
                },
              ]}
              headers={[
                { name: 'First name' },
                { name: 'Last Name', style: { minWidth: '170px' } },
                { name: 'Email', style: { minWidth: '170px' } },
              ]}
              pagination={true}
              pageLimits={pageLimits}
              limit={PAGE_LIMIT}
              page={page}
              searchKey={searchKey}
              searchPlaceholder="Enter search criteria"
              onSearch={handleSearch}
              onEnter={handleSearch}
              loading={loading}
              rowCount={count}
              onPrev={setPage}
              onNext={setPage}
              totalColSpan={20}
              searchColSpan={8}
              filterColSpan={12}
            >
              {content}
            </Table>
            {idirLookup}
          </Grid.Col>
          <Grid.Col span={4}>{rightPanel}</Grid.Col>
        </Grid.Row>
      </Grid>
      <GenericModal
        ref={infoModalRef}
        id="additiona-user-info"
        title="Additional User Info"
        icon={null}
        cancelButtonText="Close"
        cancelButtonVariant="primary"
        showConfirmButton={false}
        buttonAlign="right"
        style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}
      >
        {(context: { guid: string; attributes: any }) => {
          if (!context) return <></>;

          const attributes = omitBy(context.attributes, isEmpty);

          return (
            <div>
              <Label>GUID</Label>
              <ReadonlyItem width="400px">{context.guid}</ReadonlyItem>
              <br />
              <Label>Attributes</Label>
              <ReadonlyContainer>
                <ReadonlySubHeader width="200px">Key</ReadonlySubHeader>
                <ReadonlySubHeader width="700px">Value</ReadonlySubHeader>
              </ReadonlyContainer>
              {map(attributes, (val, key) => (
                <ReadonlyContainer>
                  <ReadonlyItem width="200px">{startCase(key)}</ReadonlyItem>
                  <ReadonlyItem width="700px">{val}</ReadonlyItem>
                </ReadonlyContainer>
              ))}
            </div>
          );
        }}
      </GenericModal>
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
