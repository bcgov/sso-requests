import React, { useEffect, useState, useRef } from 'react';
import styled from 'styled-components';
import Select, { MultiValue, ActionMeta } from 'react-select';
import { map, omitBy, startCase, isEmpty } from 'lodash';
import Button from '@button-inc/bcgov-theme/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faEye, faDownload, faLock } from '@fortawesome/free-solid-svg-icons';
import Grid from '@button-inc/bcgov-theme/Grid';
import Loader from 'react-loader-spinner';
import { Request, Option } from 'interfaces/Request';
import { withTopAlert, TopAlert } from 'layout/TopAlert';
import Table from 'components/Table';
import PlainTable from 'html-components/Table';
import { ActionButton, ActionButtonContainer } from 'components/ActionButtons';
import GenericModal, { ModalRef, emptyRef } from 'components/GenericModal';
import { searchKeycloakUsers, listClientRoles, listUserRoles, manageUserRole, KeycloakUser } from 'services/keycloak';
import { searchIdirUsers, importIdirUser, IdirUser } from 'services/bceid-webservice';

const Label = styled.label`
  font-weight: bold;
  margin-bottom: 2px;
`;

const ReadonlyContainer = styled.div`
  display: flex;
`;

const Readonly = styled.div<{ width?: string }>`
  background-color: #f1f1f1;
  margin: 2px 4px 2px 0;
  padding: 4px 6px;
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
    <Loader type="Grid" color="#000" height={45} width={45} visible={true} />
  </AlignCenter>
);

type IDPS = 'idir' | 'azureidir' | 'bceidbasic' | 'bceidbusiness' | 'bceidboth';

const idpMap = {
  idir: 'IDIR',
  azureidir: 'Azure IDIR',
  bceidbasic: 'BCeID Basic',
  bceidbusiness: 'BCeID Business',
  bceidboth: 'BCeID Both',
};

const propertyOptions = [
  { value: 'lastName', label: 'Last Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'email', label: 'Email' },
  { value: 'guid', label: 'IDP GUID' },
];

interface Props {
  selectedRequest: Request;
  alert: TopAlert;
}

const UserRoles = ({ selectedRequest, alert }: Props) => {
  const modalRef = useRef<ModalRef>(emptyRef);
  const [searched, setSearched] = useState(false);
  const [idirSearched, setIdirSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [loadingIdir, setLoadingIdir] = useState(false);
  const [rows, setRows] = useState<KeycloakUser[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [idirs, setIdirs] = useState<IdirUser[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<string>('dev');
  const [selectedIdp, setSelectedIdp] = useState<string>('');
  const [selectedProperty, setSelectedProperty] = useState<string>(propertyOptions[0].value);
  const [searchKey, setSearchKey] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

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
    setRoles([]);
    setUserRoles([]);
    setIdirs([]);
    setSelectedId(undefined);
    setSearched(false);
    setIdirSearched(false);
  };

  useEffect(() => {
    reset();
    setSelectedEnvironment('dev');
  }, [selectedRequest.id]);

  useEffect(() => {
    reset();
    getRoles();
    if (selectedRequest.devIdps) setSelectedIdp(selectedRequest.devIdps.length > 0 ? selectedRequest.devIdps[0] : '');
  }, [selectedEnvironment]);

  useEffect(() => {
    reset();
  }, [selectedIdp]);

  const handleSearch = async (searchKey: string, property = selectedProperty) => {
    if (searchKey.length < 2) return;

    setLoading(true);
    setSearchKey(searchKey);
    setSelectedProperty(property);
    setRows([]);
    setUserRoles([]);
    setSelectedId(undefined);
    setSearched(true);
    setIdirSearched(false);

    const [data, err] = await searchKeycloakUsers({
      environment: selectedEnvironment,
      idp: selectedIdp,
      property,
      searchKey,
    });

    if (data) setRows(data);
    setLoading(false);
  };

  const handleIdirSearch = async () => {
    if (searchKey.length < 2) return;

    setLoadingIdir(true);
    setIdirs([]);
    setSelectedId(undefined);
    setIdirSearched(true);

    const [data, err] = await searchIdirUsers({
      field: selectedProperty,
      search: searchKey,
    });

    if (data) setIdirs(data);
    setLoadingIdir(false);
  };

  const handleRoleChange = async (
    newValue: MultiValue<{ value: string; label: string }>,
    actionMeta: ActionMeta<{
      value: string;
      label: string;
    }>,
  ) => {
    const data: any = {};
    if (actionMeta.action === 'remove-value') {
      data.mode = 'del';
      data.roleName = actionMeta.removedValue?.value as string;
    } else {
      data.mode = 'add';
      data.roleName = actionMeta.option?.value as string;
    }

    await setLoadingRight(true);
    const [roles, err] = await manageUserRole({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username: selectedId as string,
      ...data,
    });

    await setUserRoles(roles || []);
    await setLoadingRight(false);
  };

  const handleUserSelect = async (username: string) => {
    await setLoadingRight(true);
    const [data, err] = await listUserRoles({
      environment: selectedEnvironment,
      integrationId: selectedRequest.id as number,
      username,
    });

    await setUserRoles(data || []);
    setSelectedId(username);
    setLoadingRight(false);
  };

  const handleImport = async (data: IdirUser) => {
    setLoadingIdir(true);
    await importIdirUser({ guid: data.guid, userId: data.userId });
    handleSearch(data.guid, 'guid');
    setLoadingIdir(false);
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
      </>
    );
  }

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
            handleUserSelect(row.username);
          }}
        >
          <td>{row.firstName}</td>
          <td>{row.lastName}</td>
          <td>{row.email}</td>
          <td>
            <td>
              <ActionButtonContainer>
                <ActionButton
                  icon={faEye}
                  role="button"
                  aria-label="view"
                  onClick={(event) => {
                    event.stopPropagation();

                    modalRef.current.open({
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
            <FlexItem>
              The search criteria you entered does not exist in this Keycloak realm. If your user has already logged
              into your application, please try again.
            </FlexItem>
          </FlexBox>
        </td>
      </tr>
    );
  }

  let idirLookup = null;

  if (searched && selectedIdp === 'idir') {
    if (loadingIdir) idirLookup = <Loading />;
    else if (idirSearched) {
      let rows = null;
      if (idirs.length > 0) {
        rows = idirs.map((data, ind) => {
          return (
            <tr key={data.guid}>
              <td>{data.individualIdentity.name.firstname}</td>
              <td>{data.individualIdentity.name.surname}</td>
              <td>{data.contact.email}</td>
              <td>{data.userId}</td>
              <td>
                <ActionButtonContainer>
                  <ActionButton
                    icon={faEye}
                    role="button"
                    aria-label="view"
                    onClick={() =>
                      modalRef.current.open({
                        guid: data.guid,
                        attributes: {
                          username: data.userId,
                          displayName: data.displayName,
                          firstName: data.individualIdentity.name.firstname,
                          middleName: data.individualIdentity.name.middleName,
                          lastName: data.individualIdentity.name.surname,
                          initials: data.individualIdentity.name.initials,
                          email: data.contact.email,
                          telephone: data.contact.telephone,
                          company: data.internalIdentity.company,
                          department: data.internalIdentity.department,
                          title: data.internalIdentity.title,
                        },
                      })
                    }
                    title="View"
                    size="lg"
                  />
                  <ActionButton
                    icon={faDownload}
                    role="button"
                    aria-label="import"
                    onClick={() => handleImport(data)}
                    title="Import"
                    size="lg"
                  />
                </ActionButtonContainer>
              </td>
            </tr>
          );
        });
      } else {
        rows = (
          <tr>
            <td colSpan={5}>
              <FlexBox>
                <FlexItem>
                  <FontAwesomeIcon icon={faExclamationCircle} color="#D44331" title="Edit" size="lg" />
                </FlexItem>
                <FlexItem>The search criteria you entered does not exist in the IDIR Lookup system.</FlexItem>
              </FlexBox>
            </td>
          </tr>
        );
      }

      idirLookup = (
        <>
          <hr />
          <PlainTable variant="mini">
            <thead>
              <th>First Name</th>
              <th>Last Name</th>
              <th>Email</th>
              <th>IDIR username</th>
              <th></th>
            </thead>
            <tbody>{rows}</tbody>
          </PlainTable>
        </>
      );
    } else {
      idirLookup = (
        <>
          <div className="fst-italic small mb-1">
            If you did not find the user you were looking for, you can try searching for the user in our IDIR Lookup
            tool. This tool uses a webservice to find IDIR users. so you will need to import the user that is found.
          </div>
          <Button type="button" size="small" onClick={handleIdirSearch}>
            Search in IDIR Lookup
          </Button>
        </>
      );
    }
  }

  const environments = selectedRequest?.environments || [];
  const idps = (selectedRequest?.devIdps || []) as IDPS[];

  return (
    <>
      <TopMargin />
      <Grid cols={10}>
        <Grid.Row collapse="1100" gutter={[15, 2]}>
          <Grid.Col span={6}>
            <Label>1. Search for User</Label>
            <Table
              key={searchKey}
              variant="mini"
              searchLocation="right"
              filters={[
                {
                  value: selectedEnvironment,
                  multiselect: false,
                  onChange: setSelectedEnvironment,
                  options: environments.map((env) => ({ value: env, label: startCase(env) })),
                },
                {
                  value: selectedIdp,
                  multiselect: false,
                  onChange: setSelectedIdp,
                  options: idps.map((idp) => ({ value: idp, label: idpMap[idp] })),
                },
                {
                  value: selectedProperty,
                  multiselect: false,
                  onChange: setSelectedProperty,
                  options: propertyOptions,
                },
              ]}
              headers={[{ name: 'First name' }, { name: 'Last Name' }, { name: 'Email' }]}
              searchKey={searchKey}
              searchPlaceholder="Enter search criteria"
              onSearch={handleSearch}
              onEnter={handleSearch}
              loading={loading}
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
        ref={modalRef}
        title="User Info"
        icon={null}
        confirmButtonText="Close"
        confirmButtonVariant="primary"
        showConfirmButton={true}
        showCancelButton={false}
        buttonAlign="center"
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
              {map(attributes, (val, key) => (
                <ReadonlyContainer>
                  <ReadonlyItem width="150px">{startCase(key)}</ReadonlyItem>
                  <ReadonlyItem width="400px">{val}</ReadonlyItem>
                </ReadonlyContainer>
              ))}
            </div>
          );
        }}
      </GenericModal>
    </>
  );
};

export default withTopAlert(UserRoles);
